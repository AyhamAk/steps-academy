import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Course, MOCK_COURSES, pickLocalized } from "../../constants/mockData";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { useAuthStore } from "../../store/authStore";

export function CoursesSection() {
  const { t, locale, isRTL, rtlText } = useTranslation();
  const children = useAuthStore((state) => state.user?.children ?? []);
  // Sign-ups are local-only until a courses API exists — nothing is persisted.
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);

  const confirmSignUp = (course: Course) => {
    const courseName = pickLocalized(course.name, locale);
    const message =
      children.length > 0
        ? t.home.coursesConfirmMessage(children[0].name, courseName)
        : t.home.coursesConfirmMessageNoChild(courseName);

    Alert.alert(t.home.coursesConfirmTitle, message, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.home.coursesSignUp,
        onPress: () => {
          setEnrolledIds((prev) => [...prev, course.id]);
          Alert.alert(t.home.coursesSignedUpTitle, t.home.coursesSignedUpMessage(courseName), [
            { text: t.common.ok },
          ]);
        },
      },
    ]);
  };

  const showDetails = (course: Course) => {
    Alert.alert(pickLocalized(course.name, locale), pickLocalized(course.description, locale), [
      { text: t.common.ok },
    ]);
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, rtlText]}>{t.home.coursesTitle}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {MOCK_COURSES.map((course) => {
          const isFull = course.spotsLeft === 0;
          const isEnrolled = enrolledIds.includes(course.id);
          const disabled = isFull || isEnrolled;

          return (
            // Plain View, not a Pressable — a Pressable card wrapping a Pressable
            // button makes the outer one swallow taps meant for the button.
            <View key={course.id} style={styles.card}>
              <View style={[styles.cardAccent, { backgroundColor: course.accentColor }]} />

              <Pressable onPress={() => showDetails(course)} style={styles.cardInfo}>
                <Text style={styles.emoji}>{course.emoji}</Text>
                <Text style={[styles.name, rtlText]} numberOfLines={2}>
                  {pickLocalized(course.name, locale)}
                </Text>
                <Text style={[styles.schedule, rtlText]} numberOfLines={1}>
                  {pickLocalized(course.schedule, locale)}
                </Text>
                <Text style={[styles.instructor, rtlText]} numberOfLines={1}>
                  {t.home.coursesInstructor(course.instructor)}
                </Text>

                <View
                  style={[
                    styles.spotsBadge,
                    { backgroundColor: isFull ? `${Colors.clay}26` : `${Colors.forest}1F` },
                    isRTL && styles.selfEnd,
                  ]}
                >
                  <Text style={[styles.spotsText, { color: isFull ? Colors.clay : Colors.forest }]}>
                    {isFull ? t.home.coursesFull : t.home.coursesSpotsLeft(course.spotsLeft)}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                disabled={disabled}
                onPress={() => confirmSignUp(course)}
                hitSlop={4}
                style={[
                  styles.signUpButton,
                  isFull && styles.signUpButtonFull,
                  isEnrolled && styles.signUpButtonEnrolled,
                ]}
              >
                <Text
                  style={[styles.signUpText, isFull && styles.signUpTextDisabled]}
                  numberOfLines={1}
                >
                  {isEnrolled
                    ? t.home.coursesSignedUp
                    : isFull
                      ? t.home.coursesFull
                      : t.home.coursesSignUp}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...Type.heading,
    color: Colors.bark,
    marginBottom: 12,
  },
  scroll: {
    gap: 12,
    paddingEnd: 8,
  },
  card: {
    width: 176,
    backgroundColor: Colors.linen,
    borderRadius: 18,
    padding: 16,
    paddingTop: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardInfo: {
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.75,
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    start: 0,
    end: 0,
    height: 4,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  name: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.bark,
    lineHeight: 20,
  },
  schedule: {
    ...Type.caption,
    color: Colors.textLight,
    marginTop: 6,
  },
  instructor: {
    ...Type.caption,
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  spotsBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  selfEnd: {
    alignSelf: "flex-end",
  },
  spotsText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
  },
  signUpButton: {
    backgroundColor: Colors.terracotta,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  signUpButtonFull: {
    backgroundColor: Colors.border,
  },
  signUpButtonEnrolled: {
    backgroundColor: Colors.forest,
  },
  signUpText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#FFFFFF",
  },
  signUpTextDisabled: {
    color: Colors.textLight,
  },
});
