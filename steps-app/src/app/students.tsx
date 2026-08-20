import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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

import AdminHeader from "../components/admin/AdminHeader";
import SectionLabel from "../components/ui/SectionLabel";
import { EmptyState } from "../components/gallery/EmptyState";
import { Screen } from "../components/Screen";
import { InviteCodesSection } from "../components/students/InviteCodesSection";
import { SkeletonCardList } from "../components/ui/Skeleton";
import { ScreenFadeIn } from "../components/ui/ScreenFadeIn";
import { StepsButton } from "../components/ui/StepsButton";
import { Touchable } from "../components/ui/Touchable";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
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

function GuardianPicker({ student, onDone }: { student: Student; onDone: () => void }) {
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

/**
 * Collapsed to a header row by default. Expanded, every child ran to nearly a
 * full screen, so a class of five was five screens of scrolling before you
 * could see the fifth name. Local state only — nothing is persisted.
 */
function StudentCard({ student }: { student: Student }) {
  const { t, isRTL, rtlText } = useTranslation();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
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
      <Touchable onPress={() => setIsExpanded((previous) => !previous)}>
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
          <Ionicons
            name={isExpanded ? "chevron-up" : isRTL ? "chevron-back" : "chevron-forward"}
            size={18}
            color={Colors.textLight}
          />
        </View>
      </Touchable>

      {isExpanded ? (
        <>
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
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
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

          <View style={[styles.cardFooter, isRTL && styles.rowReverse]}>
            <Touchable
              onPress={confirmRemove}
              disabled={remove.isPending}
              style={styles.iconButton}
              accessibilityLabel={t.students.delete}
            >
              {remove.isPending ? (
                <ActivityIndicator color={Colors.clay} />
              ) : (
                <Ionicons name="trash-outline" size={20} color={Colors.textLight} />
              )}
            </Touchable>
          </View>
        </>
      ) : null}
    </View>
  );
}

export default function StudentsScreen() {
  const { t, isRTL, rtlText } = useTranslation();
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
    <Screen safeBottom>
      <ScreenFadeIn style={styles.flex}>
        <AdminHeader title={t.students.title} subtitle={t.students.subtitle} />

        {/* Boxed and labelled, so it doesn't read as a second search field. */}
        <View style={styles.addCard}>
          <Text style={[styles.addCardLabel, rtlText]}>{t.students.addSectionLabel}</Text>
          <View style={[styles.addRow, isRTL && styles.rowReverse]}>
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
                <ActivityIndicator color={Colors.cream} />
              ) : (
                <Ionicons name="add" size={24} color={Colors.cream} />
              )}
            </Touchable>
          </View>
        </View>

        <View style={[styles.searchRow, isRTL && styles.rowReverse]}>
          <Ionicons name="search" size={18} color={Colors.textLight} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.students.searchPlaceholder}
            placeholderTextColor={Colors.textLight}
            style={[styles.searchInput, rtlText]}
            autoCorrect={false}
          />
          {isFetching ? <ActivityIndicator color={Colors.textLight} /> : null}
        </View>

        {/* Whole-roster action, so it sits below the roster controls rather
            than above the form for adding one child. */}
        <Touchable style={styles.sendCodesButton} onPress={() => router.push("/invite-send")}>
          <Text style={styles.sendCodesText}>{t.invite.sendTitle}</Text>
        </Touchable>

        {data ? (
          <SectionLabel
            label={
              debouncedSearch
                ? t.students.searchResults(students?.length ?? 0, data.total)
                : t.students.totalCount(data.total)
            }
          />
        ) : null}

        {isError ? (
          <EmptyState emoji="⚠️" title={t.students.couldntLoad} subtitle={t.common.tryAgain} />
        ) : !students ? (
          <SkeletonCardList count={5} height={76} />
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
  addCard: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  addCardLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    color: Colors.textLight,
    marginBottom: 8,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.bark,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.bark,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonDisabled: { opacity: 0.4 },
  sendCodesButton: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.forest,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  sendCodesText: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.forest },
  list: { paddingTop: 4, paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.terracotta}26`,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 22 },
  name: { fontFamily: Fonts.bold, fontSize: 17, lineHeight: 22, color: Colors.bark },
  meta: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  guardianList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    gap: 8,
  },
  guardianRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  guardianName: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 22, color: Colors.bark },
  guardianEmail: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18, color: Colors.textLight },
  unlink: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.clay },
  addGuardian: { marginTop: 12, minHeight: 44, justifyContent: "center" },
  addGuardianText: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.terracotta },
  picker: {
    marginTop: 12,
    backgroundColor: Colors.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  pickerTitle: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.bark, marginBottom: 8 },
  pickerSearch: {
    backgroundColor: Colors.linen,
    borderRadius: 12,
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
    gap: 12,
    paddingVertical: 12,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerName: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 22, color: Colors.bark },
  pickerEmail: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18, color: Colors.textLight },
  linkAction: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.forest },
  pickerDone: { marginTop: 12 },
  muted: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textLight, paddingVertical: 8 },
});
