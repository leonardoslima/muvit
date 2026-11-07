const {
  withSettingsGradle,
  withProjectBuildGradle,
  withAppBuildGradle,
} = require('expo/config-plugins');

function inject(contents, kind) {
  const marker = `// muvit-windows-${kind}`;
  if (contents.includes(marker)) return contents;
  return `${contents.trimEnd()}\n\n${marker}\napply from: new File(rootDir, '../plugins/windows-${kind}.gradle')\n`;
}

function withWindowsLongPaths(config) {
  let result = config;
  for (const [mod, kind] of [
    [withSettingsGradle, 'settings'],
    [withProjectBuildGradle, 'project'],
    [withAppBuildGradle, 'app'],
  ]) {
    result = mod(result, (value) => {
      if (value.modResults.language !== 'groovy')
        throw new Error('Gradle Groovy é necessário para a mitigação Windows');
      value.modResults.contents = inject(value.modResults.contents, kind);
      return value;
    });
  }
  return result;
}
module.exports = withWindowsLongPaths;
module.exports.inject = inject;
