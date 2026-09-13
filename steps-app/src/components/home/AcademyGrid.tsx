import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { track } from "../../services/analytics";
import IconTile from "../ui/IconTile";
import SectionLabel from "../ui/SectionLabel";
import { Touchable } from "../ui/Touchable";

type Tile = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  title: string;
  subtitle: string;
  href: string;
};

/**
 * The four ways into the academy, as a 2×2 grid.
 *
 * Nursery and Courses are the same screen filtered to an age band — the
 * academy thinks of them as two things, so they get two doors. Dafi path and
 * Parenting tips are placeholders: the tiles exist so the grid is whole and so
 * parents can see what is coming, and they land on a "coming soon" screen
 * rather than pretending to have content.
 */
export function AcademyGrid() {
  const { t } = useTranslation();
  const router = useRouter();

  const tiles: Tile[] = [
    {
      key: "nursery",
      icon: "happy-outline",
      tint: Colors.sky,
      title: t.home.tileNursery,
      subtitle: t.academy.ageRange(0, 3) ?? "",
      href: "/academy/nursery",
    },
    {
      key: "courses",
      icon: "library-outline",
      tint: Colors.forest,
      title: t.home.tileCourses,
      subtitle: t.academy.ageRange(3, 7) ?? "",
      href: "/academy/courses",
    },
    {
      key: "dafi",
      icon: "trail-sign-outline",
      tint: Colors.clay,
      title: t.home.tileDafi,
      subtitle: t.home.tileDafiSubtitle,
      href: "/academy/dafi",
    },
    {
      key: "tips",
      icon: "bulb-outline",
      tint: Colors.honey,
      title: t.home.tileTips,
      subtitle: t.home.tileTipsSubtitle,
      href: "/academy/tips",
    },
  ];

  return (
    <View style={styles.section}>
      <SectionLabel label={t.home.academySectionTitle} centered />
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <Touchable
            key={tile.key}
            accessibilityLabel={tile.title}
            style={styles.tile}
            onPress={() => {
              track("screen_view", { from: "academy_grid", tile: tile.key });
              router.push(tile.href as never);
            }}
          >
            <View style={styles.tileTop}>
              <IconTile tint={tile.tint} size={44}>
                <Ionicons name={tile.icon} size={23} color={tile.tint} />
              </IconTile>
            </View>
            <Text style={styles.tileTitle} numberOfLines={2} maxFontSizeMultiplier={1.3}>
              {tile.title}
            </Text>
            <Text style={styles.tileSubtitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {tile.subtitle}
            </Text>
          </Touchable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },
  tile: {
    // Two per row, with the gap taken out of the shared width. Percentages
    // rather than a measured width so it survives every screen size.
    width: "48%",
    flexGrow: 1,
    minHeight: 118,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.linen,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // Was a `flexDirection: row` with flex:1, which pinned the icon to the
  // start of the row — top-left, or top-right in Arabic — while the title
  // below it aligned by textAlign. Two mechanisms, two axes, off balance.
  tileTop: {
    marginBottom: 10,
  },
  tileTitle: {
    // Body size, not heading: at 22px a two-word label like "Parenting tips"
    // cannot fit a half-width tile and was being cut to "Parenting t…".
    ...Type.body,
    fontFamily: Fonts.bold,
    color: Colors.bark,
    textAlign: "center",
  },
  tileSubtitle: {
    ...Type.caption,
    color: Colors.textLight,
    marginTop: 3,
    textAlign: "center",
  },
});
