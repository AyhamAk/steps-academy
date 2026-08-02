// No backend exists yet for child profiles or daily activities — these are
// intentionally hardcoded until that API exists.

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

export type ActivityCategory = "art" | "cognitive" | "music" | "outdoor";

export type MockActivity = {
  id: string;
  name: string;
  time: string;
  emoji: string;
  category: ActivityCategory;
  childJoined: boolean;
};

export const MOCK_ACTIVITIES: MockActivity[] = [
  { id: "1", name: "Art & Craft", time: "9:00 AM", emoji: "🎨", category: "art", childJoined: true },
  { id: "2", name: "Puzzle Time", time: "10:30 AM", emoji: "🧩", category: "cognitive", childJoined: false },
  { id: "3", name: "Music Circle", time: "1:00 PM", emoji: "🎵", category: "music", childJoined: false },
  { id: "4", name: "Outdoor Play", time: "3:00 PM", emoji: "🌿", category: "outdoor", childJoined: false },
];
