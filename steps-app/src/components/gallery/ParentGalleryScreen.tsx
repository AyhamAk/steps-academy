import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import { getGalleryQuote } from "../../services/galleryApi";
import AdminHeader from "../admin/AdminHeader";
import { ScreenFadeIn } from "../ui/ScreenFadeIn";
import { SubTabSwitcher } from "../ui/SubTabSwitcher";
import { PillarPhotoGallery } from "./PillarPhotoGallery";

/**
 * The Gallery tab for parents: the nursery's albums on one side and the
 * courses' on the other. The two are separate programs, so their photos are
 * never mixed into one list.
 */
export function ParentGalleryScreen() {
  const { t, rtlText } = useTranslation();
  const [tab, setTab] = useState<0 | 1>(0);

  const { data: quote } = useQuery({
    queryKey: ["gallery", "quote"],
    queryFn: getGalleryQuote,
  });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenFadeIn>
        <AdminHeader
          title={t.gallery.pageTitle}
          subtitle={t.gallery.parentSubtitle}
          showBack={false}
        />

        {/* A message the academy pins above every album. One quiet line —
            it used to be a card with its own header and avatar, which gave
            a single sentence more weight than the albums beneath it. */}
        {quote ? (
          <View style={styles.quoteBanner}>
            <Text
              style={[styles.quoteText, rtlText]}
              maxFontSizeMultiplier={1.4}
            >
              {quote}
            </Text>
          </View>
        ) : null}

        <SubTabSwitcher
          tabs={[t.gallery.sectionNursery, t.gallery.sectionCourses]}
          activeIndex={tab}
          onChange={setTab}
        />

        <PillarPhotoGallery section={tab === 0 ? "nursery" : "courses"} />
      </ScreenFadeIn>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },

  quoteBanner: {
    backgroundColor: Colors.linen,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  quoteText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textLight,
  },
});
