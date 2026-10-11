const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
config.server.unstable_serverRoot = __dirname;
config.watchFolders = [...config.watchFolders, path.resolve(__dirname, '../../../..')];

const foundationConfig = withNativeWind(config, {
  input: path.resolve(__dirname, '../../global.css'),
  configPath: path.resolve(__dirname, '../../tailwind.config.ts'),
  inlineRem: 16,
});

// CSS Interop 0.2.7 usa cwd; Metro compara o caminho relativo ao projectRoot.
foundationConfig.transformer.cssInterop_outputDirectory = path.relative(
  foundationConfig.projectRoot,
  path.resolve(process.cwd(), foundationConfig.transformer.cssInterop_outputDirectory),
);

module.exports = foundationConfig;
