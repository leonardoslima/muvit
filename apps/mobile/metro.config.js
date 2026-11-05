const path = require('node:path');
const fs = require('node:fs');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
const routerPath = fs.realpathSync(require.resolve('expo-router/package.json'));
const routerStorePackage = path.resolve(path.dirname(routerPath), '../..');
if (path.basename(routerStorePackage).startsWith('expo-router@')) {
  const virtualStore = path.dirname(routerStorePackage);
  config.watchFolders = [...new Set([...config.watchFolders, virtualStore])];
}

module.exports = withNativeWind(config, {
  input: path.join(__dirname, 'global.css'),
  configPath: path.join(__dirname, 'tailwind.config.ts'),
  inlineRem: 16,
});
