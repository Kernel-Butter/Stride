import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMissionStore } from '../store/missionStore';
import { useResponsive } from '../theme/responsive';
import { useTheme } from '../theme/ThemeProvider';

export function MissionDetailScreen({ missionId, onBack }: { missionId: string; onBack: () => void }) {
  const { colors } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const mission = useMissionStore((state) => state.missions.find((item) => item.id === missionId));
  const toggleObjective = useMissionStore((state) => state.toggleObjective);

  if (!mission) return null;
  const done = mission.objectives.filter((objective) => objective.done).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[styles.content, { alignItems: 'center' }]}>
        <View style={{ width: '100%', maxWidth: contentMaxWidth, paddingHorizontal: horizontalPadding }}>
          <Pressable onPress={onBack}><Text style={[styles.back, { color: colors.muted }]}>‹ Today</Text></Pressable>
          <Text style={[styles.title, { color: colors.text }]}>{mission.title}</Text>
          <Text style={[styles.meta, { color: colors.muted }]}>
            {done}/{mission.objectives.length} objectives · due {new Date(mission.deadline).toLocaleString()}
          </Text>
          <Text style={[styles.section, { color: colors.muted }]}>OBJECTIVES</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {mission.objectives.map((objective) => (
              <Pressable
                key={objective.id}
                onPress={() => toggleObjective(mission.id, objective.id)}
                style={[styles.objective, { borderBottomColor: colors.border }]}
              >
                <View style={[styles.check, { borderColor: colors.accent }, objective.done && { backgroundColor: colors.accent }]}>
                  {objective.done ? <Text style={{ color: '#fff' }}>✓</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: objective.done ? colors.faint : colors.text }}>{objective.title}</Text>
                  {objective.rewardText ? (
                    <Text style={[styles.reward, { color: colors.accent }]}>Unlocks: {objective.rewardText}</Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 20, width: '100%' },
  back: { fontWeight: '700', marginBottom: 25 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.7 },
  meta: { marginTop: 8, lineHeight: 20 },
  section: { marginTop: 32, marginBottom: 10, fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  card: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 16 },
  objective: { flexDirection: 'row', gap: 12, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  check: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  reward: { fontSize: 12, marginTop: 5 },
});
