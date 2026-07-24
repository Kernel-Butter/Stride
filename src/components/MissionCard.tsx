import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getMissionHeat } from '../domain/heat';
import { Mission } from '../domain/mission';
import { useTheme } from '../theme/ThemeProvider';

export function MissionCard({
  mission,
  onOpen,
  onToggleObjective,
}: {
  mission: Mission;
  onOpen: () => void;
  onToggleObjective: (objectiveId: string) => void;
}) {
  const { colors } = useTheme();
  const heat = getMissionHeat(mission.priority, new Date(mission.deadline).getTime() - Date.now());
  const done = mission.objectives.filter((objective) => objective.done).length;
  const progress = mission.objectives.length ? done / mission.objectives.length : 0;
  const hours = Math.max(0, Math.ceil((new Date(mission.deadline).getTime() - Date.now()) / 3_600_000));

  return (
    <Pressable onPress={onOpen} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: colors.text }]}>{mission.title}</Text>
        <Text style={{ color: heat === 'critical' ? colors.danger : colors.accent }}>{heat}</Text>
      </View>
      <Text style={[styles.due, { color: colors.muted }]}>Due in {hours}h · {mission.priority} priority</Text>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.progress, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
      </View>
      {mission.objectives.slice(0, 2).map((objective) => (
        <Pressable
          key={objective.id}
          onPress={(event) => {
            event.stopPropagation();
            onToggleObjective(objective.id);
          }}
          style={styles.objective}
        >
          <View
            style={[
              styles.check,
              { borderColor: objective.done ? colors.accent : colors.faint },
              objective.done && { backgroundColor: colors.accent },
            ]}
          >
            {objective.done ? <Text style={styles.tick}>✓</Text> : null}
          </View>
          <Text style={[styles.objectiveText, { color: objective.done ? colors.faint : colors.text }]}>
            {objective.title}
          </Text>
        </Pressable>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  title: { flex: 1, fontSize: 17, fontWeight: '700' },
  due: { fontSize: 12, marginTop: 6 },
  track: { height: 5, borderRadius: 3, marginVertical: 14, overflow: 'hidden' },
  progress: { height: 5, borderRadius: 3 },
  objective: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  check: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  tick: { color: '#fff', fontSize: 11 },
  objectiveText: { marginLeft: 10, flex: 1, fontSize: 14 },
});
