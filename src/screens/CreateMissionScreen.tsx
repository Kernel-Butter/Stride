import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Priority } from '../domain/mission';
import { useMissionStore } from '../store/missionStore';
import { useResponsive } from '../theme/responsive';
import { useTheme } from '../theme/ThemeProvider';

interface ObjectiveDraft {
  title: string;
  rewardText: string;
  done?: boolean;
  doneAt?: string;
}

const DEADLINES = [
  { label: 'Tonight', hours: 8 },
  { label: 'Tomorrow', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
];

const DEADLINE_MATCH_TOLERANCE_MS = 60_000;

function formatDeadline(date: Date): string {
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CreateMissionScreen({
  missionId,
  onClose,
  onSaved = onClose,
}: {
  missionId?: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { colors } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const mission = useMissionStore((state) =>
    missionId ? state.missions.find((item) => item.id === missionId) : undefined,
  );
  const createMission = useMissionStore((state) => state.createMission);
  const updateMission = useMissionStore((state) => state.updateMission);
  const openedAtRef = useRef(Date.now());

  const [title, setTitle] = useState(mission?.title ?? '');
  const [priority, setPriority] = useState<Priority>(mission?.priority ?? 'medium');
  const [deadline, setDeadline] = useState<Date>(
    mission ? new Date(mission.deadline) : new Date(openedAtRef.current + 24 * 3_600_000),
  );
  const [pickerStage, setPickerStage] = useState<'closed' | 'date' | 'time' | 'datetime'>(
    'closed',
  );
  const [pendingDate, setPendingDate] = useState<Date>();
  const [objectives, setObjectives] = useState<ObjectiveDraft[]>(
    mission?.objectives.map((item) => ({
      title: item.title,
      rewardText: item.rewardText ?? '',
      done: item.done,
      doneAt: item.doneAt,
    })) ?? [{ title: '', rewardText: '' }],
  );
  const objectiveInputRefs = useRef<Array<TextInput | null>>([]);
  const [pendingFocusIndex, setPendingFocusIndex] = useState<number>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pendingFocusIndex === undefined) return;
    const input = objectiveInputRefs.current[pendingFocusIndex];
    if (!input) return;
    input.focus();
    setPendingFocusIndex(undefined);
  }, [objectives.length, pendingFocusIndex]);

  function updateObjective(index: number, field: keyof ObjectiveDraft, value: string) {
    setObjectives((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function openCustomPicker() {
    setPickerStage(Platform.OS === 'ios' ? 'datetime' : 'date');
  }

  function handlePickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'ios') {
      if (selected) setDeadline(selected);
      if (event.type === 'set' || event.type === 'dismissed') setPickerStage('closed');
      return;
    }

    // Android has no native "datetime" mode: pick the date, then the time.
    if (event.type !== 'set' || !selected) {
      setPendingDate(undefined);
      setPickerStage('closed');
      return;
    }
    if (pickerStage === 'date') {
      const combined = new Date(selected);
      combined.setHours(deadline.getHours(), deadline.getMinutes(), 0, 0);
      setPendingDate(combined);
      setPickerStage('time');
      return;
    }
    if (pickerStage === 'time') {
      const combined = new Date(pendingDate ?? deadline);
      combined.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setDeadline(combined);
      setPendingDate(undefined);
      setPickerStage('closed');
    }
  }

  async function save() {
    if (!title.trim()) {
      Alert.alert('Mission needs a name');
      return;
    }
    const validObjectives = objectives
      .filter((item) => item.title.trim())
      .map((item) => ({
        title: item.title.trim(),
        rewardText: item.rewardText.trim() || undefined,
        done: item.done,
        doneAt: item.doneAt,
      }));
    if (!validObjectives.length) {
      Alert.alert('Add at least one objective', 'Make the first step small and concrete.');
      return;
    }

    setSaving(true);
    try {
      const input = {
        title: title.trim(),
        deadline: deadline.toISOString(),
        priority,
        objectives: validObjectives,
      };
      if (missionId) {
        await updateMission({ id: missionId, ...input });
      } else {
        await createMission(input);
      }
      onSaved();
    } catch {
      Alert.alert('Could not save mission', 'Your data was not changed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAwareScrollView
        bottomOffset={28}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View
          style={{
            width: '100%',
            maxWidth: contentMaxWidth,
            paddingHorizontal: horizontalPadding,
          }}
        >
          <Pressable onPress={onClose}>
            <Text style={[styles.back, { color: colors.muted }]}>‹ Cancel</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>
            {missionId ? 'Edit mission' : 'Create mission'}
          </Text>

          <Text style={[styles.label, { color: colors.muted }]}>WHAT NEEDS TO GET DONE?</Text>
          <TextInput
            autoFocus
            multiline
            value={title}
            onChangeText={setTitle}
            placeholder="Submit the project proposal"
            placeholderTextColor={colors.faint}
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.card, borderColor: colors.border },
            ]}
          />

          <Text style={[styles.label, { color: colors.muted }]}>DEADLINE</Text>
          <View style={styles.wrap}>
            {DEADLINES.map((option) => {
              const target = openedAtRef.current + option.hours * 3_600_000;
              const selected = Math.abs(deadline.getTime() - target) < DEADLINE_MATCH_TOLERANCE_MS;
              return (
                <Pressable
                  key={option.hours}
                  onPress={() => setDeadline(new Date(openedAtRef.current + option.hours * 3_600_000))}
                  style={[
                    styles.choice,
                    { borderColor: selected ? colors.accent : colors.border },
                    selected && { backgroundColor: colors.accentSoft },
                  ]}
                >
                  <Text style={{ color: selected ? colors.accent : colors.muted }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
            {(() => {
              const isCustom = !DEADLINES.some(
                (option) =>
                  Math.abs(deadline.getTime() - (openedAtRef.current + option.hours * 3_600_000)) <
                  DEADLINE_MATCH_TOLERANCE_MS,
              );
              return (
                <Pressable
                  onPress={openCustomPicker}
                  style={[
                    styles.choice,
                    { borderColor: isCustom ? colors.accent : colors.border },
                    isCustom && { backgroundColor: colors.accentSoft },
                  ]}
                >
                  <Text style={{ color: isCustom ? colors.accent : colors.muted }}>
                    {isCustom ? formatDeadline(deadline) : 'Custom…'}
                  </Text>
                </Pressable>
              );
            })()}
          </View>

          {pickerStage !== 'closed' ? (
            <DateTimePicker
              value={pickerStage === 'time' ? pendingDate ?? deadline : deadline}
              mode={pickerStage === 'datetime' ? 'datetime' : pickerStage}
              minimumDate={new Date()}
              onChange={handlePickerChange}
            />
          ) : null}

          <Text style={[styles.label, { color: colors.muted }]}>PRIORITY</Text>
          <View style={styles.pills}>
            {(['low', 'medium', 'high'] as Priority[]).map((item) => (
              <Pressable
                key={item}
                onPress={() => setPriority(item)}
                style={[
                  styles.pill,
                  { borderColor: priority === item ? colors.accent : colors.border },
                  priority === item && { backgroundColor: colors.accentSoft },
                ]}
              >
                <Text style={{ color: priority === item ? colors.accent : colors.muted }}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.muted }]}>OBJECTIVES + REWARDS</Text>
          {objectives.map((objective, index) => (
            <View key={index} style={[styles.objectiveCard, { borderColor: colors.border }]}>
              <TextInput
                ref={(input) => {
                  objectiveInputRefs.current[index] = input;
                }}
                multiline
                value={objective.title}
                onChangeText={(value) => updateObjective(index, 'title', value)}
                placeholder={`Objective ${index + 1}`}
                placeholderTextColor={colors.faint}
                style={[styles.objectiveInput, { color: colors.text }]}
              />
              <TextInput
                multiline
                value={objective.rewardText}
                onChangeText={(value) => updateObjective(index, 'rewardText', value)}
                placeholder="Unlocks: a real-world ability (optional)"
                placeholderTextColor={colors.faint}
                style={[
                  styles.rewardInput,
                  { color: colors.accent, borderTopColor: colors.border },
                ]}
              />
              {objectives.length > 1 ? (
                <Pressable
                  onPress={() =>
                    setObjectives((items) =>
                      items.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <Text style={[styles.removeObjective, { color: colors.danger }]}>
                    Remove objective
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add another objective"
            onPress={() => {
              setPendingFocusIndex(objectives.length);
              setObjectives((items) => [...items, { title: '', rewardText: '' }]);
            }}
            style={[styles.addObjective, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.accent, fontWeight: '700' }}>+ Add objective</Text>
          </Pressable>

          <Pressable
            disabled={saving}
            onPress={save}
            style={[styles.save, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.saveText}>
              {saving ? 'Saving…' : missionId ? 'Save changes' : 'Create mission'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
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
  back: { fontWeight: '700', marginBottom: 24 },
  title: { fontSize: 30, fontWeight: '800' },
  label: { marginTop: 28, marginBottom: 8, fontSize: 11, fontWeight: '700', letterSpacing: 1.3 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 52,
    maxHeight: 130,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 11 },
  objectiveCard: { borderWidth: 1, borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  objectiveInput: {
    minHeight: 48,
    maxHeight: 130,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  rewardInput: {
    minHeight: 44,
    maxHeight: 110,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    fontSize: 12,
    textAlignVertical: 'top',
  },
  removeObjective: { paddingHorizontal: 14, paddingBottom: 12, fontSize: 12, fontWeight: '700' },
  addObjective: { borderWidth: 1, borderRadius: 13, padding: 13, alignItems: 'center' },
  save: { height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
