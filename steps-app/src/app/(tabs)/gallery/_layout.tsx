import { Stack } from "expo-router";

import { Colors } from "../../../constants/Colors";

/**
 * Opening an album from outside this tab — a notification, or a push that
 * cold-starts the app — used to build a stack containing only the album.
 * With nothing beneath it, Back left the tab entirely and dropped the parent
 * on Home instead of the gallery they thought they were inside.
 *
 * `anchor` tells the router to place the album list underneath, so Back
 * always means "the rest of the gallery".
 */
export const unstable_settings = {
  anchor: "index",
};

export default function GalleryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    />
  );
}
