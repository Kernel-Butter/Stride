const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withAlarmActivity(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    const application = configWithManifest.modResults.manifest.application?.[0];
    const activities = application?.activity ?? [];
    const mainActivity = activities.find((activity) =>
      activity['intent-filter']?.some((filter) =>
        filter.action?.some((action) => action.$?.['android:name'] === 'android.intent.action.MAIN'),
      ),
    );

    if (mainActivity) {
      mainActivity.$['android:showWhenLocked'] = 'true';
      mainActivity.$['android:turnScreenOn'] = 'true';
    }

    return configWithManifest;
  });
};
