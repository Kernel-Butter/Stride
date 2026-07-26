import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMissionStore } from '../store/missionStore';
import { useResponsive } from '../theme/responsive';
import { useTheme } from '../theme/ThemeProvider';

export function MissionDetailScreen({
  missionId,
  onBack,
  onEdit,
  onStartFocus,
  onPostpone,
  onRemoved,
}: {
  missionId: string;
  onBack: () => void;
  onEdit: () => void;
  onStartFocus: () => void;
  onPostpone: () => void;
  onRemoved: () => void;
}) {
  const { colors } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const missionRecord = useMissionStore((state) =>
    state.missions.find((item) => item.id === missionId),
  );
  const toggleObjective = useMissionStore((state) => state.toggleObjective);
  const deleteMission = useMissionStore((state) => state.deleteMission);
  const completeMission = useMissionStore((state) => state.completeMission);

  if (!missionRecord) return null;
  const mission = missionRecord;
  const done = mission.objectives.filter((objective) => objective.done).length;
  const allDone = mission.objectives.length > 0 && done === mission.objectives.length;

  function confirmDelete() {
    Alert.alert(
      'Delete this mission?',
      'Its objectives and rewards will also be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMission(mission.id);
            onRemoved();
          },
        },
      ],
    );
  }

  async function finishMission() {
    if (!allDone) {
      Alert.alert('Finish the objectives first', `${mission.objectives.length - done} still open.`);
      return;
    }
    await completeMission(mission.id);
    onRemoved();
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
              <Text style={[styles.back, { color: colors.muted }]}>‹ Today</Text>
            </Pressable>
            <Pressable onPress={onEdit}>
              <Text style={[styles.edit, { color: colors.accent }]}>Edit</Text>
            </Pressable>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{mission.title}</Text>
          <Text style={[styles.meta, { color: colors.muted }]}>
            {done}/{mission.objectives.length} objectives · due{' '}
            {new Date(mission.deadline).toLocaleString()}
          </Text>
          <Text style={[styles.section, { color: colors.muted }]}>OBJECTIVES</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {mission.objectives.map((objective) => (
              <Pressable
                key={objective.id}
                onPress={() => toggleObjective(mission.id, objective.id)}
                style={[styles.objective, { borderBottomColor: colors.border }]}
              >
                <View
                  style={[
                    styles.check,
                    { borderColor: colors.accent },
                    objective.done && { backgroundColor: colors.accent },
                  ]}
                >
                  {objective.done ? <Text style={{ color: '#fff' }}>✓</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: objective.done ? colors.faint : colors.text }}>
                    {objective.title}
                  </Text>
                  {objective.rewardText ? (
                    <Text style={[styles.reward, { color: colors.accent }]}>
                      Unlocks: {objective.rewardText}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={finishMission}
            style={[
              styles.complete,
              { backgroundColor: allDone ? colors.success : colors.border },
            ]}
          >
            <Text style={styles.completeText}>
              {allDone
                ? 'Complete mission'
                : `${mission.objectives.length - done} objectives left`}
            </Text>
          </Pressable>
          {!allDone ? (
            <Pressable
              onPress={onStartFocus}
              style={[styles.focus, { backgroundColor: colors.accentSoft }]}
            >
              <Text style={{ color: colors.accent, fontWeight: '800' }}>Start focus</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onPostpone}
            style={[styles.postpone, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={{ color: colors.text, fontWeight: '800' }}>Postpone</Text>
          </Pressable>
          <Pressable onPress={confirmDelete} style={styles.delete}>
            <Text style={{ color: colors.danger, fontWeight: '700' }}>Delete mission</Text>
          </Pressable>
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
  edit: { fontWeight: '800' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.7 },
  meta: { marginTop: 8, lineHeight: 20 },
  section: { marginTop: 32, marginBottom: 10, fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  card: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 16 },
  objective: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  check: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reward: { fontSize: 12, marginTop: 5 },
  complete: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  completeText: { color: '#fff', fontWeight: '800' },
  focus: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  postpone: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  delete: { alignItems: 'center', padding: 18 },
});
