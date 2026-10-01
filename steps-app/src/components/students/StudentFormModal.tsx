import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useSheetPadding } from "../../hooks/useLayout";
import { useTranslation } from "../../i18n/useTranslation";
import { isMobileNumber, toLocalDisplay } from "../../lib/phone";
import { createStudent, Student, StudentInput, updateStudent } from "../../services/studentsApi";
import { StepsButton } from "../ui/StepsButton";
import { Touchable } from "../ui/Touchable";

/** Every box as typed; empty strings become null on save. */
type Fields = Record<"name" | "nationalId" | "groupName" | "motherName" | "motherPhone" | "fatherPhone", string>;

const EMPTY: Fields = {
  name: "",
  nationalId: "",
  groupName: "",
  motherName: "",
  motherPhone: "",
  fatherPhone: "",
};

function fieldsOf(student: Student | null | undefined): Fields {
  if (!student) return EMPTY;
  return {
    name: student.name,
    nationalId: student.nationalId ?? "",
    groupName: student.groupName ?? "",
    motherName: student.motherName ?? "",
    motherPhone: student.motherPhone ? toLocalDisplay(student.motherPhone) : "",
    fatherPhone: student.fatherPhone ? toLocalDisplay(student.fatherPhone) : "",
  };
}

/**
 * Adds a child, or edits one, with the academy's roster columns: name, ID
 * number, group, mother's name, mother's phone and father's phone.
 *
 * The phones are what matter most: either parent signing in with their number
 * gets an account already linked to this child, with no sign-up screens.
 */
export function StudentFormModal({
  visible,
  student,
  onClose,
}: {
  visible: boolean;
  /** Edit this child; add a new one when absent. */
  student?: Student | null;
  onClose: () => void;
}) {
  const { t, isRTL, rtlText } = useTranslation();
  const queryClient = useQueryClient();
  const { sheetPadding, keyboardPadding } = useSheetPadding(32);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setFields(fieldsOf(student));
      setError(null);
    }
  }, [visible, student]);

  const set = (key: keyof Fields) => (value: string) => {
    setFields((previous) => ({ ...previous, [key]: value }));
    setError(null);
  };

  const save = useMutation({
    mutationFn: (input: StudentInput) =>
      student ? updateStudent(student.id, input) : createStudent(input),
    onSuccess: () => {
      // A saved number can link an existing parent, so guardians change too.
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onClose();
    },
    onError: (err) => {
      setError(
        axios.isAxiosError(err) && typeof err.response?.data?.message === "string"
          ? err.response.data.message
          : t.students.saveFailed
      );
    },
  });

  const submit = () => {
    if (!fields.name.trim()) return setError(t.invite.childNameRequired);
    for (const phone of [fields.motherPhone, fields.fatherPhone]) {
      if (phone.trim() && !isMobileNumber(phone)) return setError(t.auth.phoneInvalid);
    }
    save.mutate({
      name: fields.name.trim(),
      nationalId: fields.nationalId.trim() || null,
      groupName: fields.groupName.trim() || null,
      motherName: fields.motherName.trim() || null,
      motherPhone: fields.motherPhone.trim() || null,
      fatherPhone: fields.fatherPhone.trim() || null,
    });
  };

  const field = (key: keyof Fields, label: string, props: TextInputProps = {}) => (
    <View style={styles.field}>
      <Text style={[styles.label, rtlText]}>{label}</Text>
      <TextInput
        value={fields[key]}
        onChangeText={set(key)}
        placeholderTextColor={Colors.textLight}
        style={[styles.input, rtlText]}
        {...props}
      />
    </View>
  );

  // Digits read left to right in every language.
  const digits: TextInputProps = { style: [styles.input, styles.ltr, { textAlign: isRTL ? "right" : "left" }] };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingBottom: keyboardPadding }]}>
        <View style={[styles.sheet, { paddingBottom: sheetPadding }]}>
          <View style={[styles.header, isRTL && styles.rowReverse]}>
            <Text style={styles.title}>{student ? t.students.editStudent : t.students.addStudent}</Text>
            <Touchable onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {field("name", t.students.childName, { maxLength: 60 })}
            {field("nationalId", t.students.nationalId, {
              ...digits,
              keyboardType: "number-pad",
              maxLength: 9,
            })}
            {field("groupName", t.students.group, { maxLength: 40 })}
            {field("motherName", t.students.motherName, { maxLength: 60 })}
            {field("motherPhone", t.students.motherPhone, {
              ...digits,
              keyboardType: "phone-pad",
              placeholder: t.auth.phonePlaceholder,
            })}
            {field("fatherPhone", t.students.fatherPhone, {
              ...digits,
              keyboardType: "phone-pad",
              placeholder: t.auth.phonePlaceholder,
            })}
            <Text style={[styles.hint, rtlText]}>{t.students.phonesHint}</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <StepsButton
              label={student ? t.students.save : t.students.addStudent}
              onPress={submit}
              loading={save.isPending}
              style={styles.button}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(44, 36, 22, 0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "90%",
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rowReverse: { flexDirection: "row-reverse" },
  title: { fontFamily: Fonts.extraBold, fontSize: 20, color: Colors.text },
  close: { fontSize: 20, color: Colors.textLight },
  field: { marginBottom: 10 },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.text,
  },
  ltr: { writingDirection: "ltr" },
  hint: { fontFamily: Fonts.regular, fontSize: 12.5, color: Colors.textLight, marginTop: 2 },
  error: {
    fontFamily: Fonts.semiBold,
    color: Colors.rose,
    marginTop: 10,
    textAlign: "center",
  },
  button: { marginTop: 16 },
});
