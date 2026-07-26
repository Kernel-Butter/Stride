import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { listMissionPostpones, PostponeRecord } from '../db/database';
import { useMissionStore } from '../store/missionStore';
import { useResponsive } from '../theme/responsive';
import { useTheme } from '../theme/ThemeProvider';

type Delay = '1h' | '3h' | 'tonight' | 'tomorrow';

function postponedDeadline(delay: Delay): string {
  const date = new Date();
  if (delay === '1h') date.setHours(date.getHours() + 1);
  if (delay === '3h') date.setHours(date.getHours() + 3);
  if (delay === 'tomorrow') date.setDate(date.getDate() + 1);
  if (delay === 'tonight') {
    if (date.getHours() >= 22) date.setDate(date.getDate() + 1);
    date.setHours(22, 0, 0, 0);
  }
  return date.toISOString();
}

export function PostponeScreen({
  missionId,
  onCancel,
  onPostponed,
  onDoNow,
}: {
  missionId: string;
  onCancel: () => void;
  onPostponed: () => void;
  onDoNow: () => void;
}) {
  const { colors } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const missionRecord = useMissionStore((state) =>
    state.missions.find((item) => item.id === missionId),
  );
  const postponeMission = useMissionStore((state) => state.postponeMission);
  const [history, setHistory] = useState<PostponeRecord[]>([]);
  const [reason, setReason] = useState('');
  const [delay, setDelay] = useState<Delay>('tonight');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listMissionPostpones(missionId).then(setHistory);
  }, [missionId]);

  if (!missionRecord) return null;
  const mission = missionRecord;
  const validReason = reason.trim().length >= 3;

  async function confirm() {
    if (!validReason) return;
    setSaving(true);
    try {
      await postponeMission(mission.id, reason.trim(), postponedDeadline(delay));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onPostponed();
    } catch {
      Alert.alert('Could not postpone', 'The mission deadline was not changed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAwareScrollView
        bottomOffset={28}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={styles.content}
      >
        <View
          style={{
            width: '100%',
            maxWidth: contentMaxWidth,
            paddingHorizontal: horizontalPadding,
          }}
        >
          <Pressable onPress={onCancel}>
            <Text style={[styles.back, { color: colors.muted }]}>‹ Cancel</Text>
          </Pressable>
          <Text style={[styles.label, { color: colors.accent }]}>POSTPONING</Text>
          <Text style={[styles.title, { color: colors.text }]}>{mission.title}</Text>
          <Text style={[styles.summary, { color: colors.muted }]}>
            {history.length
              ? `Postponed ${history.length} ${history.length === 1 ? 'time' : 'times'} before.`
              : 'This mission has not been postponed before.'}
          </Text>

          {history.length ? (
            <View style={[styles.history, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.historyTitle, { color: colors.text }]}>Past reasons</Text>
              {history.slice(0, 4).map((item) => (
                <View key={item.id} style={styles.historyRow}>
                  <Text style={[styles.reason, { color: colors.text }]}>{item.reason}</Text>
                  <Text style={[styles.historyDate, { color: colors.faint }]}>
                    {new Date(item.at).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <TextInput
            autoFocus
            multiline
            value={reason}
            onChangeText={setReason}
            placeholder="Why are you postponing?"
            placeholderTextColor={colors.faint}
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.card, borderColor: colors.border },
            ]}
          />

          <View style={styles.delays}>
            {([
              ['1h', '+1h'],
              ['3h', '+3h'],
              ['tonight', 'Tonight'],
              ['tomorrow', 'Tomorrow'],
            ] as Array<[Delay, string]>).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setDelay(value)}
                style={[
                  styles.delay,
                  { borderColor: delay === value ? colors.accent : colors.border },
                  delay === value && { backgroundColor: colors.accentSoft },
                ]}
              >
                <Text style={{ color: delay === value ? colors.accent : colors.muted }}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            disabled={!validReason || saving}
            onPress={confirm}
            style={[
              styles.primary,
              { backgroundColor: colors.accent },
              (!validReason || saving) && { opacity: 0.4 },
            ]}
          >
            <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Postpone'}</Text>
          </Pressable>
          <Pressable onPress={onDoNow} style={styles.doNow}>
            <Text style={{ color: colors.muted, fontWeight: '700' }}>
              Actually, I’ll do it now
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', alignItems: 'center', paddingVertical: 20, paddingBottom: 50 },
  back: { fontWeight: '700', marginBottom: 28 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 7 },
  summary: { fontSize: 13, marginTop: 6 },
  history: { borderWidth: 1, borderRadius: 15, padding: 14, marginTop: 18 },
  historyTitle: { fontSize: 13, fontWeight: '800', marginBottom: 7 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 5 },
  reason: { flex: 1, fontSize: 13 },
  historyDate: { fontSize: 11 },
  input: {
    minHeight: 90,
    maxHeight: 180,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
    textAlignVertical: 'top',
  },
  delays: { flexDirection: 'row', gap: 7, marginTop: 12 },
  delay: { flex: 1, borderWidth: 1, borderRadius: 11, paddingVertical: 11, alignItems: 'center' },
  primary: {
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  doNow: { alignItems: 'center', padding: 18 },
});
