import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { MissionCard } from './src/components/MissionCard';
import { CreateMissionScreen } from './src/screens/CreateMissionScreen';
import { MissionDetailScreen } from './src/screens/MissionDetailScreen';
import { AlarmScreen } from './src/screens/AlarmScreen';
import { FocusTimerScreen } from './src/screens/FocusTimerScreen';
import { PostponeScreen } from './src/screens/PostponeScreen';
import {
  dismissMissionAlarm,
  getExactAlarmPermissionState,
  getInitialCriticalAlarmMissionId,
  getNotificationPermissionState,
  onCriticalAlarmOpened,
  openExactAlarmPermissionSettings,
  requestNotificationPermission,
  syncMissionNotificationsSafely,
} from './src/features/pressure/notifications';
import { useMissionStore } from './src/store/missionStore';
import { useResponsive } from './src/theme/responsive';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

type Screen =
  | { name: 'today' | 'create' }
  | { name: 'detail' | 'edit' | 'postpone' | 'focus'; missionId: string };

function StrideApp() {
  const { colors, mode, toggleMode } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const [screen, setScreen] = useState<Screen>({ name: 'today' });
  const [notificationState, setNotificationState] =
    useState<'checking' | 'enabled' | 'disabled'>('checking');
  const [exactAlarmState, setExactAlarmState] =
    useState<'checking' | 'enabled' | 'disabled'>('checking');
  const [activeAlarmMissionId, setActiveAlarmMissionId] = useState<string>();
  const { missions, initialize, loading, error, toggleObjective } = useMissionStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (loading) return;
    getNotificationPermissionState()
      .then(setNotificationState)
      .catch(() => setNotificationState('disabled'));
  }, [loading]);

  useEffect(() => {
    const unsubscribe = onCriticalAlarmOpened(setActiveAlarmMissionId);
    getInitialCriticalAlarmMissionId().then((missionId) => {
      if (missionId) setActiveAlarmMissionId(missionId);
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      getExactAlarmPermissionState()
        .then(setExactAlarmState)
        .catch(() => setExactAlarmState('disabled'));
    });
    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (notificationState !== 'enabled') return;
    getExactAlarmPermissionState()
      .then(setExactAlarmState)
      .catch(() => setExactAlarmState('disabled'));
  }, [notificationState]);

  const missionsRef = useRef(missions);
  missionsRef.current = missions;

  useEffect(() => {
    if (exactAlarmState === 'enabled' && !loading) {
      syncMissionNotificationsSafely(missionsRef.current);
    }
  }, [exactAlarmState, loading]);

  async function enableNotifications() {
    const enabled = await requestNotificationPermission();
    setNotificationState(enabled ? 'enabled' : 'disabled');
    if (enabled) await syncMissionNotificationsSafely(missions);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (activeAlarmMissionId && missions.some((mission) => mission.id === activeAlarmMissionId)) {
    return (
      <AlarmScreen
        missionId={activeAlarmMissionId}
        onClose={() => setActiveAlarmMissionId(undefined)}
        onPostpone={() => {
          setScreen({ name: 'postpone', missionId: activeAlarmMissionId });
          setActiveAlarmMissionId(undefined);
        }}
        onViewMission={() => {
          setScreen({ name: 'detail', missionId: activeAlarmMissionId });
          setActiveAlarmMissionId(undefined);
        }}
      />
    );
  }

  if (screen.name === 'create') {
    return <CreateMissionScreen onClose={() => setScreen({ name: 'today' })} />;
  }

  if (screen.name === 'edit') {
    return (
      <CreateMissionScreen
        missionId={screen.missionId}
        onClose={() => setScreen({ name: 'detail', missionId: screen.missionId })}
        onSaved={() => setScreen({ name: 'detail', missionId: screen.missionId })}
      />
    );
  }

  if (screen.name === 'postpone') {
    return (
      <PostponeScreen
        missionId={screen.missionId}
        onCancel={() => setScreen({ name: 'detail', missionId: screen.missionId })}
        onPostponed={() => setScreen({ name: 'today' })}
        onDoNow={async () => {
          await dismissMissionAlarm(screen.missionId);
          setScreen({ name: 'detail', missionId: screen.missionId });
        }}
      />
    );
  }

  if (screen.name === 'focus') {
    return (
      <FocusTimerScreen
        missionId={screen.missionId}
        onClose={() => setScreen({ name: 'detail', missionId: screen.missionId })}
      />
    );
  }

  if (screen.name === 'detail') {
    return (
      <MissionDetailScreen
        missionId={screen.missionId}
        onBack={() => setScreen({ name: 'today' })}
        onEdit={() => setScreen({ name: 'edit', missionId: screen.missionId })}
        onStartFocus={() => setScreen({ name: 'focus', missionId: screen.missionId })}
        onPostpone={() => setScreen({ name: 'postpone', missionId: screen.missionId })}
        onRemoved={() => setScreen({ name: 'today' })}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={[styles.content, { alignItems: 'center' }]}>
        <View style={{ width: '100%', maxWidth: contentMaxWidth, paddingHorizontal: horizontalPadding }}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.eyebrow, { color: colors.muted }]}>FRIDAY</Text>
              <Text style={[styles.title, { color: colors.text }]}>Today</Text>
            </View>
            <Pressable
              accessibilityLabel="Toggle color theme"
              onPress={toggleMode}
              style={[styles.themeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={{ color: colors.text }}>{mode === 'dark' ? '☀' : '☾'}</Text>
            </Pressable>
          </View>

          <View style={[styles.summary, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.summaryValue, { color: colors.accent }]}>{missions.length}</Text>
            <Text style={[styles.summaryText, { color: colors.text }]}>missions in motion</Text>
          </View>

          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          {notificationState === 'disabled' ? (
            <View
              style={[
                styles.notificationCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.notificationTitle, { color: colors.text }]}>
                  Enable mission reminders
                </Text>
                <Text style={[styles.notificationText, { color: colors.muted }]}>
                  Warm and hot missions can remind you before their deadlines.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={enableNotifications}
                style={[styles.enableButton, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.enableText}>Enable</Text>
              </Pressable>
            </View>
          ) : null}

          {notificationState === 'enabled' && exactAlarmState === 'disabled' ? (
            <View
              style={[
                styles.notificationCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.notificationTitle, { color: colors.text }]}>
                  Allow critical alarms
                </Text>
                <Text style={[styles.notificationText, { color: colors.muted }]}>
                  Android requires separate permission for exact full-screen alarms.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={openExactAlarmPermissionSettings}
                style={[styles.enableButton, { backgroundColor: colors.danger }]}
              >
                <Text style={styles.enableText}>Allow</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={[styles.section, { color: colors.muted }]}>UP NEXT</Text>
          {missions.length === 0 ? (
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing queued yet</Text>
              <Text style={{ color: colors.muted }}>Create one clear mission to begin.</Text>
            </View>
          ) : (
            missions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onOpen={() => setScreen({ name: 'detail', missionId: mission.id })}
                onToggleObjective={(objectiveId) =>
                  toggleObjective(mission.id, objectiveId).catch(() =>
                    Alert.alert('Could not save', 'Please try again.'),
                  )
                }
              />
            ))
          )}
        </View>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create mission"
        onPress={() => setScreen({ name: 'create' })}
        style={[styles.fab, { backgroundColor: colors.accent }]}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

export default function App() {
  const systemMode = useColorScheme();
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <ThemeProvider initialMode={systemMode === 'dark' ? 'dark' : 'light'}>
          <StrideApp />
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 20, paddingBottom: 110, width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  themeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: { flexDirection: 'row', alignItems: 'baseline', padding: 18, borderRadius: 18, marginTop: 22 },
  summaryValue: { fontSize: 28, fontWeight: '800', marginRight: 8 },
  summaryText: { fontSize: 15, fontWeight: '600' },
  section: { marginTop: 26, marginBottom: 10, fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  error: { marginTop: 12 },
  notificationCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationTitle: { fontSize: 14, fontWeight: '700' },
  notificationText: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  enableButton: { borderRadius: 11, paddingHorizontal: 14, paddingVertical: 10 },
  enableText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  empty: { padding: 22, borderWidth: 1, borderRadius: 18 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 5 },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 34 },
});
