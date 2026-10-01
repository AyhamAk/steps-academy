import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { isMobileNumber, toLocalDisplay } from "../../lib/phone";
import { updateStudent } from "../../services/studentsApi";
import { Touchable } from "../ui/Touchable";

/**
 * A child's guardian phones: the numbers that link a parent to this child.
 *
 * A parent who signs in with one of them is linked automatically — at sign-up,
 * or straight away if they already have an account — so this replaces sending
 * an invite code. Mum and dad each get their own number.
 */
export function GuardianPhonesSection({
  studentId,
  phones,
}: {
  studentId: string;
  phones: string[];
}) {
  const { t, isRTL, rtlText } = useTranslation();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (next: string[]) => updateStudent(studentId, { guardianPhones: next }),
    onSuccess: () => {
      setDraft("");
      setError(null);
      // Saving a number can link an existing parent, so guardians change too.
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      setError(message ?? t.students.phoneSaveFailed);
    },
  });

  const add = () => {
    if (!isMobileNumber(draft)) return setError(t.auth.phoneInvalid);
    save.mutate([...phones, draft.trim()]);
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.title, rtlText]}>{t.students.phonesTitle}</Text>
      <Text style={[styles.hint, rtlText]}>{t.students.phonesHint}</Text>

      {phones.length === 0 ? (
        <Text style={[styles.empty, rtlText]}>{t.students.noPhones}</Text>
      ) : (
        phones.map((phone) => (
          <View key={phone} style={[styles.row, isRTL && styles.rowReverse]}>
            <Text style={styles.phone}>{toLocalDisplay(phone)}</Text>
            <Touchable
              onPress={() => save.mutate(phones.filter((p) => p !== phone))}
              disabled={save.isPending}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.remove}>{t.students.removePhone}</Text>
            </Touchable>
          </View>
        ))
      )}

      <View style={[styles.addRow, isRTL && styles.rowReverse]}>
        <TextInput
          style={styles.input}
          placeholder={t.auth.phonePlaceholder}
          placeholderTextColor={Colors.textLight}
          value={draft}
          onChangeText={(value) => {
            setDraft(value);
            setError(null);
          }}
          keyboardType="phone-pad"
          onSubmitEditing={add}
        />
        <Touchable onPress={add} disabled={save.isPending || !draft.trim()} style={styles.addButton}>
          {save.isPending ? (
            <ActivityIndicator color={Colors.sage} />
          ) : (
            <Text style={styles.addText}>+ {t.students.addPhone}</Text>
          )}
        </Touchable>
      </View>
      {error ? <Text style={[styles.error, rtlText]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  title: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.bark, marginBottom: 4 },
  hint: { ...Type.caption, color: Colors.textLight, marginBottom: 10 },
  empty: { ...Type.caption, color: Colors.textLight, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  rowReverse: { flexDirection: "row-reverse" },
  // Digits read left to right in every language.
  phone: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.text, writingDirection: "ltr" },
  remove: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.rose },
  addRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...Type.body,
    color: Colors.text,
    writingDirection: "ltr",
  },
  addButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  addText: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.coral },
  error: { ...Type.caption, color: Colors.rose, marginTop: 6 },
});
