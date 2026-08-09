// The weekly schedule is the only thing still hardcoded here — it has no API
// yet. Courses, events and captions are all real backend records now.

import { Locale } from "../store/localeStore";
import { Colors } from "./Colors";

export type MockChild = {
  id: string;
  name: string;
  emoji: string;
  age: number;
  color: string;
  present: boolean;
  enrolledSince: string;
  favouriteActivity: string;
  photoCount: number;
  nextPickup: string;
};

export const MOCK_CHILDREN: MockChild[] = [
  {
    id: "1",
    name: "Layla",
    emoji: "🐘",
    age: 2,
    color: "#E07A3A",
    present: true,
    enrolledSince: "Sep 2024",
    favouriteActivity: "Art & Craft",
    photoCount: 12,
    nextPickup: "Today at 3:00 PM",
  },
];

/**
 * Names carry their own per-locale variants rather than living in
 * `translations.ts` — this is placeholder content that a real schedule/courses
 * API will replace wholesale, so keeping it self-contained avoids polluting the
 * translation dictionaries with strings that have no long-term home.
 */
export type Localized = { en: string; ar: string; he: string };

export function pickLocalized(value: Localized, locale: Locale): string {
  return value[locale];
}

// ── WEEKLY SCHEDULE ──

export type WeekDay = "sun" | "mon" | "tue" | "wed" | "thu";

export type ScheduleActivity = {
  id: string;
  name: Localized;
  emoji: string;
  time: string;
  durationMinutes: number;
  accentColor: string;
};

export type DaySchedule = {
  day: WeekDay;
  activities: ScheduleActivity[];
};

const MORNING_CIRCLE: Localized = {
  en: "Morning Circle",
  ar: "حلقة الصباح",
  he: "מעגל בוקר",
};
const ART_AND_CRAFT: Localized = { en: "Art & Craft", ar: "الفن والأشغال", he: "אומנות ויצירה" };
const OUTDOOR_PLAY: Localized = { en: "Outdoor Play", ar: "اللعب في الخارج", he: "משחק בחוץ" };
const STORY_TIME: Localized = { en: "Story Time", ar: "وقت القصة", he: "שעת סיפור" };
const MUSIC_CIRCLE: Localized = { en: "Music Circle", ar: "حلقة الموسيقى", he: "מעגל מוזיקה" };

export const MOCK_WEEK_SCHEDULE: DaySchedule[] = [
  {
    day: "sun",
    activities: [
      { id: "ws1", name: MORNING_CIRCLE, emoji: "☀️", time: "8:30 AM", durationMinutes: 30, accentColor: Colors.honey },
      { id: "ws2", name: ART_AND_CRAFT, emoji: "🎨", time: "9:00 AM", durationMinutes: 45, accentColor: Colors.terracotta },
      { id: "ws3", name: OUTDOOR_PLAY, emoji: "🌿", time: "10:30 AM", durationMinutes: 30, accentColor: Colors.forest },
      { id: "ws4", name: STORY_TIME, emoji: "📖", time: "11:00 AM", durationMinutes: 20, accentColor: Colors.sky },
    ],
  },
  {
    day: "mon",
    activities: [
      { id: "wm1", name: MORNING_CIRCLE, emoji: "☀️", time: "8:30 AM", durationMinutes: 30, accentColor: Colors.honey },
      { id: "wm2", name: MUSIC_CIRCLE, emoji: "🎵", time: "9:00 AM", durationMinutes: 45, accentColor: Colors.sky },
      {
        id: "wm3",
        name: { en: "Sensory Play", ar: "اللعب الحسي", he: "משחק חושי" },
        emoji: "🖐",
        time: "10:30 AM",
        durationMinutes: 30,
        accentColor: Colors.clay,
      },
      {
        id: "wm4",
        name: { en: "Puzzle Time", ar: "وقت الألغاز", he: "שעת פאזל" },
        emoji: "🧩",
        time: "11:00 AM",
        durationMinutes: 30,
        accentColor: Colors.forest,
      },
    ],
  },
  {
    day: "tue",
    activities: [
      { id: "wt1", name: MORNING_CIRCLE, emoji: "☀️", time: "8:30 AM", durationMinutes: 30, accentColor: Colors.honey },
      {
        id: "wt2",
        name: { en: "Numbers & Math", ar: "الأرقام والحساب", he: "מספרים וחשבון" },
        emoji: "🔢",
        time: "9:00 AM",
        durationMinutes: 30,
        accentColor: Colors.terracotta,
      },
      { id: "wt3", name: ART_AND_CRAFT, emoji: "🎨", time: "10:00 AM", durationMinutes: 45, accentColor: Colors.terracotta },
      { id: "wt4", name: OUTDOOR_PLAY, emoji: "🌿", time: "11:00 AM", durationMinutes: 30, accentColor: Colors.forest },
    ],
  },
  {
    day: "wed",
    activities: [
      { id: "ww1", name: MORNING_CIRCLE, emoji: "☀️", time: "8:30 AM", durationMinutes: 30, accentColor: Colors.honey },
      {
        id: "ww2",
        name: { en: "Yoga & Movement", ar: "اليوغا والحركة", he: "יוגה ותנועה" },
        emoji: "🧘",
        time: "9:00 AM",
        durationMinutes: 30,
        accentColor: Colors.forest,
      },
      { id: "ww3", name: MUSIC_CIRCLE, emoji: "🎵", time: "10:00 AM", durationMinutes: 45, accentColor: Colors.sky },
      { id: "ww4", name: STORY_TIME, emoji: "📖", time: "11:00 AM", durationMinutes: 20, accentColor: Colors.sky },
    ],
  },
  {
    day: "thu",
    activities: [
      { id: "wth1", name: MORNING_CIRCLE, emoji: "☀️", time: "8:30 AM", durationMinutes: 30, accentColor: Colors.honey },
      {
        id: "wth2",
        name: { en: "Show & Tell", ar: "احكِ واعرض", he: "הצג וספר" },
        emoji: "🌟",
        time: "9:00 AM",
        durationMinutes: 30,
        accentColor: Colors.honey,
      },
      {
        id: "wth3",
        name: { en: "Cooking Fun", ar: "متعة الطبخ", he: "כיף בבישול" },
        emoji: "🍪",
        time: "10:00 AM",
        durationMinutes: 45,
        accentColor: Colors.clay,
      },
      {
        id: "wth4",
        name: { en: "Free Play", ar: "لعب حر", he: "משחק חופשי" },
        emoji: "🎈",
        time: "11:00 AM",
        durationMinutes: 30,
        accentColor: Colors.sky,
      },
    ],
  },
];
