import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";

type NameChipInputProps = {
  names: string[];
  onChange: (names: string[]) => void;
  suggestions: string[];
  placeholder?: string;
};

export function NameChipInput({ names, onChange, suggestions, placeholder }: NameChipInputProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  const filteredSuggestions = useMemo(() => {
    const selected = new Set(names.map((n) => n.toLowerCase()));
    const query = draft.trim().toLowerCase();
    return suggestions
      .filter((name) => !selected.has(name.toLowerCase()))
      .filter((name) => !query || name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [suggestions, names, draft]);

  const addName = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (names.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...names, trimmed]);
    setDraft("");
  };

  const removeName = (name: string) => {
    onChange(names.filter((n) => n !== name));
  };

  return (
    <View>
      {names.length > 0 ? (
        <View style={styles.chipRow}>
          {names.map((name) => (
            <Pressable key={name} style={styles.chip} onPress={() => removeName(name)}>
              <Text style={styles.chipText}>{name} ✕</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={placeholder ?? t.gallery.kidNamePlaceholder}
        placeholderTextColor={Colors.textLight}
        style={styles.input}
        onSubmitEditing={() => addName(draft)}
        returnKeyType="done"
      />

      {filteredSuggestions.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.suggestionRow}
        >
          {filteredSuggestions.map((name) => (
            <Pressable
              key={name}
              style={styles.suggestionChip}
              onPress={() => addName(name)}
            >
              <Text style={styles.suggestionText}>+ {name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    backgroundColor: `${Colors.primary}20`,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.text,
  },
  suggestionRow: {
    marginTop: 8,
  },
  suggestionChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginEnd: 8,
  },
  suggestionText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textLight,
  },
});
