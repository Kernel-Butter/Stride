const { withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withNotifeeMavenRepo(config) {
  return withProjectBuildGradle(config, (configWithGradle) => {
    const repoLine = 'maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }';
    if (configWithGradle.modResults.contents.includes(repoLine)) {
      return configWithGradle;
    }
    configWithGradle.modResults.contents = configWithGradle.modResults.contents.replace(
      /allprojects\s*\{\s*repositories\s*\{/,
      (match) => `${match}\n    ${repoLine}`,
    );
    return configWithGradle;
  });
};
