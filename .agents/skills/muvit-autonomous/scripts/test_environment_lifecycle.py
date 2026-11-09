"""Recusas e limites de segurança do ciclo de vida do ambiente."""
import copy
import contextlib
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

import environment_lifecycle as lifecycle
import prepare_environment as cli


class LifecycleTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.folder = self.root / 'artifacts' / 'ambiente-spike' / 'test-run' / 'environment'
        self.folder.mkdir(parents=True)
        self.request = {'root': str(self.root), 'card': 'ambiente-spike', 'run_id': 'test-run',
                        'backend': True, 'android': False, 'system_image': None}
        self.identity, self.name = lifecycle.resource_identity(self.request)
        self.state = {'schema_version': 2, 'request': self.request, 'identity': self.identity,
                      'name': self.name, 'container': self.name, 'container_id': 'a' * 64}
        self.container = {'Id': 'a' * 64, 'Name': '/' + self.name,
                          'Config': {'Labels': {'muvit.environment': self.identity}},
                          'State': {'Running': False}}

    def test_rejects_state_from_another_worktree(self) -> None:
        state = copy.deepcopy(self.state)
        state['request']['root'] = str(self.root / 'other')
        with self.assertRaises(RuntimeError):
            lifecycle.validate_state(state, self.root, self.folder, 'ambiente-spike', 'test-run')

    def test_rejects_legacy_state_without_adopting_resources(self) -> None:
        with self.assertRaises(RuntimeError):
            lifecycle.validate_state({'request': self.request}, self.root, self.folder,
                                     'ambiente-spike', 'test-run')

    def test_rejects_artifacts_path_outside_workspace(self) -> None:
        with self.assertRaises(RuntimeError):
            lifecycle.validate_state(self.state, self.root, self.root.parent / 'outside',
                                     'ambiente-spike', 'test-run')

    def test_rejects_foreign_container_label(self) -> None:
        self.container['Config']['Labels']['muvit.environment'] = 'another-run'
        with self.assertRaises(RuntimeError):
            lifecycle.assert_container(self.container, self.state)

    def test_rejects_same_name_but_replaced_container(self) -> None:
        self.container['Id'] = 'b' * 64
        with self.assertRaises(RuntimeError):
            lifecycle.assert_container(self.container, self.state)

    def test_rejects_incomplete_container_receipt(self) -> None:
        del self.state['container_id']
        with self.assertRaises(RuntimeError):
            lifecycle.assert_container(self.container, self.state)

    def test_accepts_exact_container(self) -> None:
        lifecycle.assert_container(self.container, self.state)

    def test_ambiguous_launch_cannot_be_retried_as_a_fresh_launch(self) -> None:
        with self.assertRaises(RuntimeError):
            lifecycle.assert_launchable({'launch_pending': True})

    def test_rejects_avd_ini_redirected_to_another_directory(self) -> None:
        avd_home = self.root / 'avds'
        avd_home.mkdir()
        self.state['avd_path'] = str(self.folder / 'avd')
        self.state['avd_home'] = str(avd_home)
        self.state['avd_reserved'] = True
        (self.folder / 'avd').mkdir()
        (self.folder / 'avd-owner.json').write_text(json.dumps({
            'identity': self.identity, 'path': self.state['avd_path']}), encoding='utf-8')
        (avd_home / f'{self.name}.ini').write_text(f'path={self.root / "foreign"}\n', encoding='utf-8')
        with self.assertRaises(RuntimeError):
            lifecycle.assert_avd(self.state, self.folder, avd_home)

    def test_accepts_owned_avd_with_exact_sdk_path(self) -> None:
        avd_home = self.root / 'avds'
        avd_home.mkdir()
        self.state.update(avd_path=str(self.folder / 'avd'), avd_home=str(avd_home), avd_reserved=True)
        (self.folder / 'avd').mkdir()
        (self.folder / 'avd-owner.json').write_text(json.dumps({
            'identity': self.identity, 'path': self.state['avd_path']}), encoding='utf-8')
        (avd_home / f'{self.name}.ini').write_text(f"path={self.state['avd_path']}\n", encoding='utf-8')
        self.assertTrue(lifecycle.assert_avd(self.state, self.folder, avd_home))

    def test_invalid_state_type_is_blocked(self) -> None:
        with self.assertRaises(RuntimeError):
            lifecycle.validate_state([], self.root, self.folder, 'ambiente-spike', 'test-run')

    def test_rejects_offline_emulator_before_cleanup(self) -> None:
        invoke = Mock(return_value='List of devices attached\nemulator-5554\toffline\n')
        with self.assertRaises(RuntimeError):
            lifecycle.active_avd(self.state, 'adb', invoke)
        self.assertEqual(invoke.call_count, 1)

    def test_rejects_serial_reassigned_to_another_avd(self) -> None:
        self.state['emulator_port'] = 5554
        invoke = Mock(side_effect=['List of devices attached\nemulator-5554\tdevice\n',
                                   'foreign-avd\nOK'])
        with self.assertRaises(RuntimeError):
            lifecycle.active_avd(self.state, 'adb', invoke)

    def test_cleanup_preflights_every_resource_before_stopping(self) -> None:
        invoke = Mock()
        with patch.object(lifecycle, 'inspect_resources', side_effect=RuntimeError('foreign AVD')):
            with self.assertRaises(RuntimeError):
                lifecycle.cleanup('stop', self.state, self.folder, {}, invoke)
        invoke.assert_not_called()

    def test_remove_refuses_running_resources(self) -> None:
        invoke = Mock()
        with patch.object(lifecycle, 'inspect_resources', return_value={'container_running': True,
                                                                      'container_id': 'a' * 64,
                                                                      'serial': None, 'avd_exists': False}):
            with self.assertRaises(RuntimeError):
                lifecycle.cleanup('remove', self.state, self.folder, {}, invoke)
        invoke.assert_not_called()

    def test_stop_never_deletes_data(self) -> None:
        invoke = Mock(return_value='')
        snapshots = [{'container_running': True, 'container_id': 'a' * 64,
                      'serial': None, 'avd_exists': False},
                     {'container_running': False, 'container_id': 'a' * 64,
                      'serial': None, 'avd_exists': False}]
        with patch.object(lifecycle, 'inspect_resources', side_effect=snapshots):
            lifecycle.cleanup('stop', self.state, self.folder, {}, invoke)
        self.assertEqual(invoke.call_args_list[0].args[0], ['docker', 'stop', 'a' * 64])
        self.assertEqual(invoke.call_count, 1)

    def test_remove_requires_explicit_data_deletion_before_any_command(self) -> None:
        args = ['prepare_environment.py', 'remove', '--card', 'ambiente-spike',
                '--run-id', 'test-run', '--apply']
        with patch('sys.argv', args), patch.object(cli, 'command') as invoke:
            with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as error:
                cli.main()
            self.assertEqual(error.exception.code, 2)
            invoke.assert_not_called()

    def test_dry_run_does_not_create_state_or_invoke_services(self) -> None:
        args = ['prepare_environment.py', '--card', 'ambiente-spike', '--run-id', 'dry', '--backend']
        with patch('sys.argv', args), patch.object(cli, 'command', return_value=str(self.root)) as invoke:
            with patch.object(Path, 'cwd', return_value=self.root), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(cli.main(), 0)
        self.assertEqual(invoke.call_count, 1)
        self.assertFalse((self.root / 'artifacts' / 'ambiente-spike' / 'dry').exists())

    def test_status_works_without_orca_environment_or_executable(self) -> None:
        (self.folder / 'state.json').write_text(json.dumps(self.state), encoding='utf-8')
        args = ['prepare_environment.py', 'status', '--card', 'ambiente-spike', '--run-id', 'test-run']
        with patch.dict(os.environ, {'USERPROFILE': str(self.root)}, clear=True), patch('sys.argv', args):
            with patch.object(cli, 'command', return_value=str(self.root)):
                with patch.object(Path, 'cwd', return_value=self.root):
                    with patch.object(cli, 'inspect_resources', return_value={}), contextlib.redirect_stdout(io.StringIO()):
                        self.assertEqual(cli.main(), 0)

    def test_android_foreground_action_can_be_planned_without_orca(self) -> None:
        self.state['request']['android'] = True
        (self.folder / 'state.json').write_text(json.dumps(self.state), encoding='utf-8')
        args = ['prepare_environment.py', 'run-android', '--card', 'ambiente-spike', '--run-id', 'test-run']
        with patch.dict(os.environ, {'USERPROFILE': str(self.root)}, clear=True), patch('sys.argv', args):
            with patch.object(cli, 'command', return_value=str(self.root)), patch.object(Path, 'cwd', return_value=self.root):
                with contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(cli.main(), 0)

    def test_foreground_launch_inherits_terminal_and_releases_lock_for_stop(self) -> None:
        self.state['request']['android'] = True
        self.state['emulator_port'] = 5554
        (self.folder / 'state.json').write_text(json.dumps(self.state), encoding='utf-8')
        args = ['prepare_environment.py', 'run-android', '--card', 'ambiente-spike',
                '--run-id', 'test-run', '--apply']
        child = Mock(pid=123)

        def foreground_wait() -> int:
            self.assertFalse((self.folder / 'prepare.lock').exists())
            return 0

        child.wait.side_effect = foreground_wait
        with patch.dict(os.environ, {'USERPROFILE': str(self.root)}, clear=True), patch('sys.argv', args):
            with patch.object(cli, 'command', return_value=str(self.root)), patch.object(Path, 'cwd', return_value=self.root):
                with patch.object(Path, 'is_file', return_value=True), patch.object(Path, 'glob', return_value=[Path('avdmanager.bat')]):
                    with patch.object(cli, 'assert_avd', return_value=True), patch.object(cli, 'active_avd', return_value=None):
                        with patch.object(cli, 'available_port', return_value=True), patch.object(cli.subprocess, 'Popen', return_value=child) as spawn:
                            self.assertEqual(cli.main(), 0)
        self.assertEqual(spawn.call_args.kwargs, {'cwd': self.root})
        self.assertIsInstance(spawn.call_args.args[0], list)
        child.wait.assert_called_once()


if __name__ == '__main__':
    unittest.main()
