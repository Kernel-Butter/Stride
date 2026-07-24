import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { MissionCard } from './src/components/MissionCard';
import { CreateMissionScreen } from './src/screens/CreateMissionScreen';
import { MissionDetailScreen } from './src/screens/MissionDetailScreen';
import { useMissionStore } from './src/store/missionStore';
import { useResponsive } from './src/theme/responsive';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

type Screen = { name: 'today' | 'create' } | { name: 'detail'; missionId: string };

function StrideApp() {
  const { colors, mode, toggleMode } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const [screen, setScreen] = useState<Screen>({ name: 'today' });
  const { missions, initialize, loading, error, toggleObjective } = useMissionStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (screen.name === 'create') {
    return <CreateMissionScreen onClose={() => setScreen({ name: 'today' })} />;
  }

  if (screen.name === 'detail') {
    return (
      <MissionDetailScreen
        missionId={screen.missionId}
        onBack={() => setScreen({ name: 'today' })}
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
    <ThemeProvider initialMode={systemMode === 'dark' ? 'dark' : 'light'}>
      <StrideApp />
    </ThemeProvider>
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
