import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getMissionSnoozeCount,
  incrementMissionSnoozeCount,
} from '../db/database';
import {
  dismissMissionAlarm,
  scheduleMissionSnooze,
} from '../features/pressure/notifications';
import { useMissionStore } from '../store/missionStore';
import { useTheme } from '../theme/ThemeProvider';

const MAX_SNOOZES = 3;

export function AlarmScreen({
  missionId,
  onClose,
  onPostpone,
  onViewMission,
}: {
  missionId: string;
  onClose: () => void;
  onPostpone: () => void;
  onViewMission: () => void;
}) {
  const { colors } = useTheme();
  const missionRecord = useMissionStore((state) =>
    state.missions.find((item) => item.id === missionId),
  );
  const completeMission = useMissionStore((state) => state.completeMission);
  const [snoozes, setSnoozes] = useState(0);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    getMissionSnoozeCount(missionId).then(setSnoozes);
    const timer = setInterval(() => setClock(new Date()), 1_000);
    return () => clearInterval(timer);
  }, [missionId]);

  if (!missionRecord) return null;
  const mission = missionRecord;
  const snoozesLeft = Math.max(0, MAX_SNOOZES - snoozes);

  async function markDone() {
    await dismissMissionAlarm(mission.id);
    await completeMission(mission.id);
    onClose();
  }

  async function snooze() {
    if (snoozesLeft === 0) return;
    const minutes = 30;
    const snoozedUntil = new Date(Date.now() + minutes * 60_000).toISOString();
    const count = await incrementMissionSnoozeCount(mission.id, snoozedUntil);
    setSnoozes(count);
    await scheduleMissionSnooze(mission, minutes);
    onClose();
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.urgent, { color: colors.danger }]}>URGENT</Text>
        <Text style={[styles.title, { color: colors.text }]}>{mission.title}</Text>
        <Text style={[styles.deadline, { color: colors.danger }]}>
          {new Date(mission.deadline).getTime() <= Date.now()
            ? 'Deadline reached'
            : `Due ${new Date(mission.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
        </Text>
        <Text style={[styles.clock, { color: colors.muted }]}>
          {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>

        <Pressable onPress={markDone} style={[styles.primary, { backgroundColor: colors.accent }]}>
          <Text style={styles.primaryText}>Mark done</Text>
        </Pressable>
        <Pressable
          disabled={snoozesLeft === 0}
          onPress={snooze}
          style={[
            styles.secondary,
            { backgroundColor: colors.card, borderColor: colors.border },
            snoozesLeft === 0 && { opacity: 0.45 },
          ]}
        >
          <Text style={[styles.secondaryText, { color: colors.text }]}>
            {snoozesLeft > 0
              ? `Snooze 30 min · ${snoozesLeft} left`
              : 'No snoozes left today'}
          </Text>
        </Pressable>
        <Pressable onPress={onPostpone} style={styles.ghost}>
          <Text style={{ color: colors.muted, fontWeight: '700' }}>Postpone</Text>
        </Pressable>
        <Pressable onPress={onViewMission} style={styles.viewMission}>
          <Text style={{ color: colors.muted, fontWeight: '700' }}>View mission</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  urgent: { fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center', marginTop: 18 },
  deadline: { fontSize: 15, fontWeight: '700', marginTop: 8 },
  clock: { fontSize: 42, fontWeight: '300', marginVertical: 42 },
  primary: {
    width: '100%',
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondary: {
    width: '100%',
    height: 52,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryText: { fontSize: 14, fontWeight: '700' },
  ghost: { padding: 18 },
  viewMission: { padding: 8 },
});
