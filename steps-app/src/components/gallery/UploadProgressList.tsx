import { Image, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";

export type UploadItem = {
  uri: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
};

export function UploadProgressList({ uploads }: { uploads: UploadItem[] }) {
  const { t, isRTL } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.gallery.uploading(uploads.length)}</Text>
      <View style={styles.row}>
        {uploads.map((item, index) => (
          <View key={`${item.uri}-${index}`} style={styles.tile}>
            <Image source={{ uri: item.uri }} style={styles.image} />
            <View style={[styles.progressTrack, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${item.progress}%`,
                    backgroundColor: item.status === "error" ? Colors.clay : Colors.forest,
                  },
                ]}
              />
            </View>
            <Text style={styles.statusText}>
              {item.status === "error"
                ? t.gallery.failed
                : item.status === "done"
                  ? t.gallery.uploadDone
                  : `${item.progress}%`}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.text,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    width: 72,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  statusText: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 3,
    textAlign: "center",
  },
});
