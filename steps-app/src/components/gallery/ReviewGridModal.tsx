import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import { Photo, resolvePhotoUrl } from "../../services/galleryApi";
import { EmptyState } from "./EmptyState";
import { UploadItem, UploadProgressList } from "./UploadProgressList";

type ReviewGridModalProps = {
  eventName: string;
  photos: Photo[];
  uploads: UploadItem[];
  onAddPhotos: () => void;
  onClose: () => void;
  onOpenTag: (photo: Photo) => void;
};

export function ReviewGridModal({
  eventName,
  photos,
  uploads,
  onAddPhotos,
  onClose,
  onOpenTag,
}: ReviewGridModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{eventName}</Text>
            <Text style={styles.subtitle}>{t.gallery.tapPhotoToEditTags}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.addButton} onPress={onAddPhotos}>
              <Text style={styles.addButtonText}>{t.gallery.addPhotos}</Text>
            </Pressable>
            <Pressable onPress={onClose}>
              <Text style={styles.close}>{t.common.done}</Text>
            </Pressable>
          </View>
        </View>

        {uploads.length > 0 ? <UploadProgressList uploads={uploads} /> : null}

        {photos.length === 0 && uploads.length === 0 ? (
          <EmptyState
            emoji="🖼️"
            title={t.gallery.noPhotosYetReview}
            subtitle={t.gallery.tapAddToUpload}
          />
        ) : (
          <FlatList
            data={photos}
            keyExtractor={(photo) => photo.id}
            numColumns={3}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <Pressable style={styles.tile} onPress={() => onOpenTag(item)}>
                <Image source={{ uri: resolvePhotoUrl(item.url) }} style={styles.image} />
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.tags.length}</Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerText: {
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: `${Colors.primary}20`,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addButtonText: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
    fontSize: 14,
  },
  close: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
    fontSize: 15,
  },
  grid: {
    gap: 8,
  },
  tile: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.card,
  },
  badge: {
    position: "absolute",
    top: 6,
    end: 6,
    backgroundColor: "rgba(44, 36, 22, 0.75)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
    fontSize: 11,
  },
});
