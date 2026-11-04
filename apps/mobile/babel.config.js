/** @param {{ cache: (enabled: boolean) => void }} api */
module.exports = function configureBabel(api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
