import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { EmptyState } from "../components/gallery/EmptyState";
import { Screen } from "../components/Screen";
import { InviteCodesSection } from "../components/students/InviteCodesSection";
import { BalloonLoader } from "../components/ui/BalloonLoader";
import { ScreenFadeIn } from "../components/ui/ScreenFadeIn";
import { StepsButton } from "../components/ui/StepsButton";
import { StepsHeader } from "../components/ui/StepsHeader";
import { Touchable } from "../components/ui/Touchable";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { Type } from "../constants/Typography";
import { useTranslation } from "../i18n/useTranslation";
import {
  createStudent,
  deleteStudent,
  linkGuardian,
  listParents,
  listStudents,
  Student,
  unlinkGuardian,
} from "../services/studentsApi";

/** Keeps typing responsive by only querying once the user pauses. */
function useDebounced(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function GuardianPicker({
  student,
  onDone,
}: {
  student: Student;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [parentSearch, setParentSearch] = useState("");
  const debouncedParentSearch = useDebounced(parentSearch, 300);
  const { data: parentPage } = useQuery({
    queryKey: ["parents", debouncedParentSearch],
    queryFn: () => listParents({ search: debouncedParentSearch || undefined, limit: 25 }),
    placeholderData: (previous) => previous,
  });

  const link = useMutation({
    mutationFn: (parentId: string) => linkGuardian(student.id, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onDone();
    },
  });

  const linkedIds = student.guardians.map((guardian) => guardian.id);
  const available = (parentPage?.parents ?? []).filter((parent) => !linkedIds.includes(parent.id));

  return (
    <View style={styles.picker}>
      <Text style={styles.pickerTitle}>{t.students.linkGuardianTitle(student.name)}</Text>
      {/* Searchable, because scrolling a few hundred parents to find one is not usable. */}
      <TextInput
        value={parentSearch}
        onChangeText={setParentSearch}
        placeholder={t.students.searchParentPlaceholder}
        placeholderTextColor={Colors.textLight}
        style={styles.pickerSearch}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {available.length === 0 ? (
        <Text style={styles.muted}>{t.students.noParentsAvailable}</Text>
      ) : (
        available.map((parent) => (
          <Touchable
            key={parent.id}
            style={styles.pickerRow}
            disabled={link.isPending}
            onPress={() => link.mutate(parent.id)}
          >
            <View style={styles.flex}>
              <Text style={styles.pickerName}>{parent.name}</Text>
              <Text style={styles.pickerEmail}>{parent.email}</Text>
            </View>
            {link.isPending && link.variables === parent.id ? (
              <ActivityIndicator color={Colors.forest} />
            ) : (
              <Text style={styles.linkAction}>+ {t.students.link}</Text>
            )}
          </Touchable>
        ))
      )}
      <StepsButton
        label={t.common.done}
        variant="outline"
        onPress={onDone}
        style={styles.pickerDone}
      />
    </View>
  );
}

function StudentCard({ student }: { student: Student }) {
  const { t, isRTL, rtlText } = useTranslation();
  const queryClient = useQueryClient();
  const [isPickingGuardian, setIsPickingGuardian] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["students"] });

  const unlink = useMutation({
    mutationFn: (parentId: string) => unlinkGuardian(student.id, parentId),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: () => deleteStudent(student.id), onSuccess: refresh });

  const confirmRemove = () =>
    Alert.alert(t.students.deleteTitle, t.students.deleteMessage(student.name), [
      { text: t.common.cancel, style: "cancel" },
      { text: t.students.delete, style: "destructive", onPress: () => remove.mutate() },
    ]);

  return (
    <View style={styles.card}>
      <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>🐘</Text>
        </View>
        <View style={styles.flex}>
          <Text style={[styles.name, rtlText]}>{student.name}</Text>
          <Text style={[styles.meta, rtlText]}>
            {student.guardians.length === 0
              ? t.students.noGuardians
              : t.students.guardianCount(student.guardians.length)}
            {" · "}
            {t.students.photoCount(student.photoCount)}
          </Text>
        </View>
        <Touchable onPress={confirmRemove} hitSlop={8} disabled={remove.isPending}>
          {remove.isPending ? (
            <ActivityIndicator color={Colors.clay} />
          ) : (
            <Text style={styles.removeIcon}>🗑</Text>
          )}
        </Touchable>
      </View>

      {student.guardians.length > 0 ? (
        <View style={styles.guardianList}>
          {student.guardians.map((guardian) => (
            <View key={guardian.id} style={[styles.guardianRow, isRTL && styles.rowReverse]}>
              <View style={styles.flex}>
                <Text style={[styles.guardianName, rtlText]}>{guardian.name}</Text>
                <Text style={[styles.guardianEmail, rtlText]}>{guardian.email}</Text>
              </View>
              <Touchable
                onPress={() => unlink.mutate(guardian.id)}
                hitSlop={8}
                disabled={unlink.isPending}
              >
                {unlink.isPending && unlink.variables === guardian.id ? (
                  <ActivityIndicator color={Colors.clay} />
                ) : (
                  <Text style={styles.unlink}>{t.students.unlink}</Text>
                )}
              </Touchable>
            </View>
          ))}
        </View>
      ) : null}

      {isPickingGuardian ? (
        <GuardianPicker student={student} onDone={() => setIsPickingGuardian(false)} />
      ) : (
        <Touchable style={styles.addGuardian} onPress={() => setIsPickingGuardian(true)}>
          <Text style={styles.addGuardianText}>+ {t.students.addGuardian}</Text>
        </Touchable>
      )}

      {/* Linking by hand still exists for parents who registered before invite
          codes; for everyone new, handing over a code does the linking. */}
      <InviteCodesSection studentId={student.id} studentName={student.name} />
    </View>
  );
}

export default function StudentsScreen() {
  const { t, rtlText } = useTranslation();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);

  const { data, isError, isFetching } = useQuery({
    queryKey: ["students", debouncedSearch],
    queryFn: () => listStudents({ search: debouncedSearch || undefined }),
    placeholderData: (previous) => previous,
  });
  const students = data?.students;

  const create = useMutation({
    mutationFn: () => createStudent({ name: newName.trim() }),
    onSuccess: () => {
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });

  return (
    <Screen>
      <ScreenFadeIn style={styles.flex}>
        <StepsHeader title={t.students.title} subtitle={t.students.subtitle} showBack />

        <View style={styles.addRow}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder={t.students.namePlaceholder}
            placeholderTextColor={Colors.textLight}
            style={[styles.input, rtlText]}
            returnKeyType="done"
            onSubmitEditing={() => newName.trim() && create.mutate()}
          />
          <Touchable
            style={[styles.addButton, !newName.trim() && styles.addButtonDisabled]}
            disabled={!newName.trim() || create.isPending}
            onPress={() => create.mutate()}
            accessibilityLabel={t.students.addStudent}
          >
            {create.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.addButtonText}>+</Text>
            )}
          </Touchable>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.students.searchPlaceholder}
            placeholderTextColor={Colors.textLight}
            style={[styles.input, rtlText]}
            autoCorrect={false}
          />
          {isFetching ? <ActivityIndicator color={Colors.textLight} /> : null}
        </View>

        {data ? (
          <Text style={[styles.count, rtlText]}>
            {debouncedSearch
              ? t.students.searchResults(students?.length ?? 0, data.total)
              : t.students.totalCount(data.total)}
          </Text>
        ) : null}

        {isError ? (
          <EmptyState emoji="⚠️" title={t.students.couldntLoad} subtitle={t.common.tryAgain} />
        ) : !students ? (
          <BalloonLoader label={t.students.loading} />
        ) : students.length === 0 ? (
          <EmptyState
            emoji={debouncedSearch ? "🔍" : "👶"}
            title={debouncedSearch ? t.students.noMatches : t.students.empty}
            subtitle={debouncedSearch ? t.students.noMatchesSubtitle : t.students.emptySubtitle}
          />
        ) : (
          <FlatList
            data={students}
            keyExtractor={(student) => student.id}
            renderItem={({ item }) => <StudentCard student={item} />}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            // Long lists stay smooth: offscreen rows are dropped rather than
            // kept mounted, which matters once this is hundreds of children.
            removeClippedSubviews
            initialNumToRender={12}
            windowSize={11}
          />
        )}
      </ScreenFadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  addRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  count: {
    ...Type.caption,
    color: Colors.textLight,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.linen,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.bark,
  },
  addButton: {
    width: 48,
    borderRadius: 14,
    backgroundColor: Colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonDisabled: { opacity: 0.4 },
  addButtonText: { fontFamily: Fonts.bold, fontSize: 22, color: "#FFFFFF" },
  list: { paddingTop: 8, paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: Colors.linen,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.terracotta}26`,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 22 },
  name: { ...Type.body, fontFamily: Fonts.bold, color: Colors.bark },
  meta: { ...Type.caption, color: Colors.textLight, marginTop: 2 },
  removeIcon: { fontSize: 18 },
  guardianList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    gap: 8,
  },
  guardianRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  guardianName: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.bark },
  guardianEmail: { ...Type.caption, color: Colors.textLight },
  unlink: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.clay },
  addGuardian: { marginTop: 12 },
  addGuardianText: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.terracotta },
  picker: {
    marginTop: 12,
    backgroundColor: Colors.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  pickerTitle: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.bark, marginBottom: 8 },
  pickerSearch: {
    backgroundColor: Colors.linen,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.bark,
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerName: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.bark },
  pickerEmail: { ...Type.caption, color: Colors.textLight },
  linkAction: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.forest },
  pickerDone: { marginTop: 12 },
  muted: { ...Type.caption, color: Colors.textLight, paddingVertical: 8 },
});
