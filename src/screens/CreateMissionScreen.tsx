import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Priority } from '../domain/mission';
import { useMissionStore } from '../store/missionStore';
import { useResponsive } from '../theme/responsive';
import { useTheme } from '../theme/ThemeProvider';

export function CreateMissionScreen({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const createMission = useMissionStore((state) => state.createMission);
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) {
      Alert.alert('Mission needs a name');
      return;
    }
    setSaving(true);
    try {
      await createMission({
        title: title.trim(),
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority,
        objectives: objective.trim() ? [{ title: objective.trim() }] : [],
      });
      onClose();
    } catch {
      Alert.alert('Could not create mission', 'Your data was not changed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[styles.content, { alignItems: 'center' }]} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: contentMaxWidth, paddingHorizontal: horizontalPadding }}>
          <Pressable onPress={onClose}><Text style={[styles.back, { color: colors.muted }]}>‹ Cancel</Text></Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Create mission</Text>
          <Text style={[styles.label, { color: colors.muted }]}>WHAT NEEDS TO GET DONE?</Text>
          <TextInput
            autoFocus
            value={title}
            onChangeText={setTitle}
            placeholder="Submit the project proposal"
            placeholderTextColor={colors.faint}
            style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
          />
          <Text style={[styles.label, { color: colors.muted }]}>FIRST OBJECTIVE</Text>
          <TextInput
            value={objective}
            onChangeText={setObjective}
            placeholder="Draft the outline"
            placeholderTextColor={colors.faint}
            style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
          />
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
                <Text style={{ color: priority === item ? colors.accent : colors.muted }}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.note, { color: colors.muted }]}>Initial deadline: 24 hours from now.</Text>
          <Pressable disabled={saving} onPress={save} style={[styles.save, { backgroundColor: colors.accent }]}>
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Create mission'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 20, width: '100%' },
  back: { fontWeight: '700', marginBottom: 24 },
  title: { fontSize: 30, fontWeight: '800' },
  label: { marginTop: 28, marginBottom: 8, fontSize: 11, fontWeight: '700', letterSpacing: 1.3 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 52, fontSize: 15 },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  note: { marginTop: 16, fontSize: 12 },
  save: { height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
