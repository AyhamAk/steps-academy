import { Alert, FlatList, Image, Modal, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useLayout } from "../../hooks/useLayout";
import { useTranslation } from "../../i18n/useTranslation";
import { GalleryEvent, Photo, resolvePhotoUrl } from "../../services/galleryApi";
import { EmptyState } from "./EmptyState";
import { EventCaptionEditor } from "./EventCaptionEditor";
import { UploadItem, UploadProgressList } from "./UploadProgressList";
import { Touchable } from "../ui/Touchable";

type ReviewGridModalProps = {
  event: GalleryEvent;
  photos: Photo[];
  uploads: UploadItem[];
  onAddPhotos: () => void;
  onClose: () => void;
  onOpenTag: (photo: Photo) => void;
  onCaptionSaved: (caption: string | null) => void;
  onDeletePhoto: (photo: Photo) => void;
};

export function ReviewGridModal({
  event,
  photos,
  uploads,
  onAddPhotos,
  onClose,
  onOpenTag,
  onCaptionSaved,
  onDeletePhoto,
}: ReviewGridModalProps) {
  const { t } = useTranslation();
  // Opaque fullscreen modal: it owns both insets itself, since no SafeAreaView
  // wraps it and edge-to-edge puts the system bars over its corners.
  const { insets } = useLayout();

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{event.name}</Text>
            <Text style={styles.subtitle}>{t.gallery.tapPhotoHint}</Text>
          </View>
          <View style={styles.headerActions}>
            <Touchable style={styles.addButton} onPress={onAddPhotos}>
              <Text style={styles.addButtonText}>{t.gallery.addPhotos}</Text>
            </Touchable>
            <Touchable onPress={onClose}>
              <Text style={styles.close}>{t.common.done}</Text>
            </Touchable>
          </View>
        </View>

        {uploads.length > 0 ? <UploadProgressList uploads={uploads} /> : null}

        {photos.length === 0 && uploads.length === 0 ? (
          <>
            <EventCaptionEditor
              eventId={event.id}
              caption={event.caption}
              onSaved={onCaptionSaved}
            />
            <EmptyState
              emoji="🖼️"
              title={t.gallery.noPhotosYetReview}
              subtitle={t.gallery.tapAddToUpload}
            />
          </>
        ) : (
          <FlatList
            data={photos}
            keyExtractor={(photo) => photo.id}
            numColumns={3}
            contentContainerStyle={styles.grid}
            ListHeaderComponent={
              <EventCaptionEditor
                eventId={event.id}
                caption={event.caption}
                onSaved={onCaptionSaved}
              />
            }
            renderItem={({ item }) => (
              <Touchable
                style={styles.tile}
                onPress={() => onOpenTag(item)}
                onLongPress={() =>
                  Alert.alert(t.gallery.deletePhotoTitle, t.gallery.deletePhotoMessage, [
                    { text: t.common.cancel, style: "cancel" },
                    {
                      text: t.gallery.deletePhoto,
                      style: "destructive",
                      onPress: () => onDeletePhoto(item),
                    },
                  ])
                }
              >
                <Image source={{ uri: resolvePhotoUrl(item.url) }} style={styles.image} />
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.tags.length}</Text>
                </View>
              </Touchable>
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
