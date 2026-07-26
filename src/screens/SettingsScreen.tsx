import { useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSetting, setSetting } from '../db/database';
import {
  cycleHour,
  DEFAULT_QUIET_HOURS,
  formatHour,
  parseHourSetting,
} from '../domain/settings';
import {
  getExactAlarmPermissionState,
  getNotificationPermissionState,
  openExactAlarmPermissionSettings,
  requestNotificationPermission,
  syncMissionNotificationsSafely,
} from '../features/pressure/notifications';
import { useMissionStore } from '../store/missionStore';
import { useResponsive } from '../theme/responsive';
import { useTheme } from '../theme/ThemeProvider';

type PermissionState = 'checking' | 'enabled' | 'disabled';

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { colors, mode, toggleMode } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const missions = useMissionStore((state) => state.missions);
  const [start, setStart] = useState(DEFAULT_QUIET_HOURS.start);
  const [end, setEnd] = useState(DEFAULT_QUIET_HOURS.end);
  const [notificationState, setNotificationState] = useState<PermissionState>('checking');
  const [exactAlarmState, setExactAlarmState] = useState<PermissionState>('checking');

  useEffect(() => {
    Promise.all([
      getSetting('quiet_hours_start'),
      getSetting('quiet_hours_end'),
    ])
      .then(([savedStart, savedEnd]) => {
        setStart(parseHourSetting(savedStart, DEFAULT_QUIET_HOURS.start));
        setEnd(parseHourSetting(savedEnd, DEFAULT_QUIET_HOURS.end));
      })
      .catch(() => undefined);
    getNotificationPermissionState()
      .then(setNotificationState)
      .catch(() => setNotificationState('disabled'));
    getExactAlarmPermissionState()
      .then(setExactAlarmState)
      .catch(() => setExactAlarmState('disabled'));
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      getExactAlarmPermissionState()
        .then(setExactAlarmState)
        .catch(() => setExactAlarmState('disabled'));
    });
    return () => subscription.remove();
  }, []);

  function updateHour(
    key: 'quiet_hours_start' | 'quiet_hours_end',
    hour: number,
    direction: 1 | -1,
  ) {
    const nextHour = cycleHour(hour, direction);
    if (key === 'quiet_hours_start') setStart(nextHour);
    else setEnd(nextHour);
    void setSetting(key, String(nextHour)).then(() => syncMissionNotificationsSafely(missions));
  }

  async function fixNotificationPermission() {
    await requestNotificationPermission();
    setNotificationState(await getNotificationPermissionState());
  }

  function hourRow(
    label: string,
    key: 'quiet_hours_start' | 'quiet_hours_end',
    hour: number,
  ) {
    return (
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        <View style={styles.hourControls}>
          <Pressable
            onPress={() => updateHour(key, hour, -1)}
            style={[styles.stepButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.stepText, { color: colors.accent }]}>−</Text>
          </Pressable>
          <Text style={[styles.hour, { color: colors.text }]}>{formatHour(hour)}</Text>
          <Pressable
            onPress={() => updateHour(key, hour, 1)}
            style={[styles.stepButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.stepText, { color: colors.accent }]}>+</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function permissionRow(
    label: string,
    state: PermissionState,
    onFix: () => void,
    danger = false,
  ) {
    return (
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {state === 'enabled' ? (
          <Text style={[styles.status, { color: colors.success }]}>Enabled</Text>
        ) : state === 'checking' ? (
          <Text style={[styles.status, { color: colors.muted }]}>Checking…</Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onFix}
            style={[
              styles.enableButton,
              { backgroundColor: danger ? colors.danger : colors.accent },
            ]}
          >
            <Text style={styles.enableText}>Fix</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={{
            width: '100%',
            maxWidth: contentMaxWidth,
            paddingHorizontal: horizontalPadding,
          }}
        >
          <View style={styles.topRow}>
            <Pressable onPress={onBack}>
              <Text style={[styles.back, { color: colors.muted }]}>‹ Back</Text>
            </Pressable>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

          <Text style={[styles.section, { color: colors.muted }]}>QUIET HOURS</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {hourRow('Start', 'quiet_hours_start', start)}
            {hourRow('End', 'quiet_hours_end', end)}
          </View>

          <Text style={[styles.section, { color: colors.muted }]}>NOTIFICATIONS</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {permissionRow('Reminders', notificationState, fixNotificationPermission)}
            {permissionRow(
              'Critical alarms',
              exactAlarmState,
              () => void openExactAlarmPermissionSettings(),
              true,
            )}
          </View>

          <Text style={[styles.section, { color: colors.muted }]}>APPEARANCE</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Theme</Text>
              <View style={styles.pills}>
                {(['light', 'dark'] as const).map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => {
                      if (mode !== item) toggleMode();
                    }}
                    style={[
                      styles.pill,
                      { borderColor: mode === item ? colors.accent : colors.border },
                      mode === item && { backgroundColor: colors.accentSoft },
                    ]}
                  >
                    <Text style={{ color: mode === item ? colors.accent : colors.muted }}>
                      {item === 'light' ? 'Light' : 'Dark'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 20,
    paddingBottom: 50,
    width: '100%',
    alignItems: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  back: { fontWeight: '700' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.7 },
  section: { marginTop: 32, marginBottom: 10, fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  card: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 16 },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowLabel: { fontSize: 14, fontWeight: '700' },
  hourControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 20, lineHeight: 22 },
  hour: { width: 76, textAlign: 'center', fontSize: 13, fontWeight: '700' },
  status: { fontSize: 13, fontWeight: '800' },
  enableButton: { borderRadius: 11, paddingHorizontal: 14, paddingVertical: 10 },
  enableText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 10 },
});
