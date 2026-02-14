module.exports = function (api) {
  api.cache(true);

  const plugins = ["react-native-reanimated/plugin"];

  // Remove console.log in production builds, but keep error and warn
  if (process.env.NODE_ENV === "production") {
    plugins.unshift(["transform-remove-console", { exclude: ["error", "warn"] }]);
  }

  return {
    presets: ["babel-preset-expo", "nativewind/babel"],
    plugins,
  };
};
