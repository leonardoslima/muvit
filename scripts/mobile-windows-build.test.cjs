const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('prebuild aplica a mitigação uma vez em cada arquivo Gradle', () => {
  const pluginPath = path.join(__dirname, '../apps/mobile/plugins/with-windows-long-paths.js');
  assert.ok(fs.existsSync(pluginPath), 'plugin de prebuild ausente');
  const { inject } = require(pluginPath);
  for (const kind of ['settings', 'project', 'app']) {
    const result = inject('// arquivo Gradle\n', kind);
    assert.match(result, new RegExp(`muvit-windows-${kind}`));
    assert.equal(inject(result, kind), result);
  }
});
