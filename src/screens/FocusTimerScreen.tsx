import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';
import { insertFocusSession } from '../db/database';
import {
  FOCUS_DURATIONS_MINUTES,
  formatClock,
  HOLD_TO_END_MS,
  holdProgress,
  remainingSeconds,
} from '../domain/focus';
import { useMissionStore } from '../store/missionStore';
import { useResponsive } from '../theme/responsive';
import { useTheme } from '../theme/ThemeProvider';

type TimerState = 'picking' | 'running' | 'complete';

export function FocusTimerScreen({
  missionId,
  onClose,
}: {
  missionId: string;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const missionRecord = useMissionStore((state) =>
    state.missions.find((item) => item.id === missionId),
  );
  const [timerState, setTimerState] = useState<TimerState>('picking');
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [startedAt, setStartedAt] = useState<number>();
  const [secondsLeft, setSecondsLeft] = useState(targetMinutes * 60);
  const [progress, setProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const ending = useRef(false);

  useEffect(() => {
    if (timerState !== 'running') return;
    let mounted = true;
    activateKeepAwakeAsync().then(() => {
      if (!mounted) deactivateKeepAwake();
    });
    return () => {
      mounted = false;
      deactivateKeepAwake();
    };
  }, [timerState]);

  useEffect(() => {
    if (timerState !== 'running' || startedAt === undefined) return;
    const timer = setInterval(() => {
      setSecondsLeft(remainingSeconds(startedAt, targetMinutes, Date.now()));
    }, 1_000);
    return () => clearInterval(timer);
  }, [startedAt, targetMinutes, timerState]);

  useEffect(() => {
    if (timerState !== 'running' || startedAt === undefined || secondsLeft !== 0) return;
    if (ending.current) return;
    ending.current = true;
    setTimerState('complete');
    const sessionStartedAt = startedAt;
    async function finishSession() {
      await insertFocusSession({
        missionId,
        targetMinutes,
        actualSeconds: targetMinutes * 60,
        completed: true,
        startedAt: new Date(sessionStartedAt).toISOString(),
        endedAt: new Date().toISOString(),
      });
    }
    finishSession();
  }, [missionId, secondsLeft, startedAt, targetMinutes, timerState]);

  useEffect(() => () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
  }, []);

  if (!missionRecord) return null;
  const mission = missionRecord;

  function startSession() {
    const now = Date.now();
    ending.current = false;
    setStartedAt(now);
    setSecondsLeft(targetMinutes * 60);
    setTimerState('running');
  }

  async function endEarly(now: number) {
    if (ending.current || startedAt === undefined) return;
    ending.current = true;
    if (holdTimer.current) clearInterval(holdTimer.current);
    deactivateKeepAwake();
    await insertFocusSession({
      missionId,
      targetMinutes,
      actualSeconds: Math.floor((now - startedAt) / 1_000),
      completed: false,
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date(now).toISOString(),
    });
    onClose();
  }

  function beginHold() {
    const holdStartedAt = Date.now();
    setProgress(0);
    holdTimer.current = setInterval(() => {
      const now = Date.now();
      const nextProgress = holdProgress(holdStartedAt, now, HOLD_TO_END_MS);
      setProgress(nextProgress);
      if (nextProgress === 1) endEarly(now);
    }, 50);
  }

  function cancelHold() {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = undefined;
    if (!ending.current) setProgress(0);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.content,
          { maxWidth: contentMaxWidth, paddingHorizontal: horizontalPadding },
        ]}
      >
        {timerState === 'picking' ? (
          <>
            <Text style={[styles.title, { color: colors.text }]}>{mission.title}</Text>
            <Text style={[styles.label, { color: colors.muted }]}>FOCUS DURATION</Text>
            <View style={styles.pills}>
              {FOCUS_DURATIONS_MINUTES.map((minutes) => (
                <Pressable
                  key={minutes}
                  onPress={() => setTargetMinutes(minutes)}
                  style={[
                    styles.pill,
                    { borderColor: targetMinutes === minutes ? colors.accent : colors.border },
                    targetMinutes === minutes && { backgroundColor: colors.accentSoft },
                  ]}
                >
                  <Text style={{ color: targetMinutes === minutes ? colors.accent : colors.muted }}>
                    {minutes} min
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={startSession}
              style={[styles.primary, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.primaryText}>Start</Text>
            </Pressable>
          </>
        ) : null}

        {timerState === 'running' ? (
          <>
            <Text style={[styles.title, { color: colors.text }]}>{mission.title}</Text>
            <Text style={[styles.clock, { color: colors.text }]}>
              {formatClock(secondsLeft)}
            </Text>
            <Pressable
              onPressIn={beginHold}
              onPressOut={cancelHold}
              style={[styles.hold, { backgroundColor: colors.card, borderColor: colors.danger }]}
            >
              <View
                style={[
                  styles.holdFill,
                  { backgroundColor: colors.danger, width: `${progress * 100}%` },
                ]}
              />
              <Text style={[styles.holdText, { color: progress > 0.5 ? colors.card : colors.danger }]}>
                Hold to end early
              </Text>
            </Pressable>
          </>
        ) : null}

        {timerState === 'complete' ? (
          <>
            <Text style={[styles.complete, { color: colors.success }]}>Session complete</Text>
            <Pressable
              onPress={onClose}
              style={[styles.primary, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.primaryText}>Done</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center' },
  label: { marginTop: 32, marginBottom: 10, fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  clock: { fontSize: 46, fontWeight: '300', textAlign: 'center', marginVertical: 42 },
  primary: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  primaryText: { color: '#fff', fontWeight: '800' },
  hold: {
    width: '100%',
    height: 52,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  holdFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  holdText: { fontSize: 14, fontWeight: '800' },
  complete: { fontSize: 30, fontWeight: '800', textAlign: 'center' },
});
