import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import {
  GalleryEvent,
  listEventPhotosAdmin,
  listEvents,
  Photo,
  uploadEventPhoto,
} from "../../services/galleryApi";
import { listStudents } from "../../services/studentsApi";
import { formatIsoDate } from "../../utils/date";
import { ScreenFadeIn } from "../ui/ScreenFadeIn";
import { SkeletonEventList } from "../ui/Skeleton";
import { StepsButton } from "../ui/StepsButton";
import { StepsCard } from "../ui/StepsCard";
import { StepsHeader } from "../ui/StepsHeader";
import { EmptyState } from "./EmptyState";
import { EventPickerModal } from "./EventPickerModal";
import { ReviewGridModal } from "./ReviewGridModal";
import { TagEditorModal } from "./TagEditorModal";
import { UploadItem } from "./UploadProgressList";

const EVENT_BORDER_COLORS = [Colors.terracotta, Colors.forest, Colors.sky, Colors.honey];

export function AdminGalleryScreen() {
  const { t, isRTL, rtlText } = useTranslation();
  const queryClient = useQueryClient();
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const [reviewEvent, setReviewEvent] = useState<GalleryEvent | null>(null);
  const [reviewPhotos, setReviewPhotos] = useState<Photo[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [tagEditorPhoto, setTagEditorPhoto] = useState<Photo | null>(null);

  const {
    data,
    isError,
    refetch: reload,
  } = useQuery({
    queryKey: ["gallery", "admin"],
    queryFn: async () => {
      // limit 100 is the API cap — the tag/attendee pickers filter client-side
      // from this set, and both have their own search fields.
      const [eventList, studentPage] = await Promise.all([
        listEvents(),
        listStudents({ limit: 100 }),
      ]);
      return { events: eventList, students: studentPage.students };
    },
  });
  const events = data?.events ?? [];
  const students = data?.students ?? [];

  // Opens the review screen for an event. `skipFetch` is used for a just-created
  // event, which can't have any photos yet — avoids a pointless network round trip.
  const openEventForReview = async (event: GalleryEvent, skipFetch = false) => {
    setReviewEvent(event);
    if (skipFetch) {
      setReviewPhotos([]);
      return;
    }
    try {
      const { photos } = await listEventPhotosAdmin(event.id);
      setReviewPhotos(photos);
    } catch {
      Alert.alert(t.gallery.couldntOpenEvent, t.common.tryAgain, [{ text: t.common.ok }]);
      setReviewEvent(null);
    }
  };

  const handleEventSelected = (event: GalleryEvent) => {
    setIsPickerVisible(false);
    openEventForReview(event);
  };

  const handleEventCreated = (event: GalleryEvent) => {
    queryClient.setQueryData(["gallery", "admin"], (old: typeof data) =>
      old ? { ...old, events: [event, ...old.events] } : old
    );
    setIsPickerVisible(false);
    openEventForReview(event, true);
  };

  const closeReview = () => {
    setReviewEvent(null);
    setReviewPhotos([]);
    setUploads([]);
    // Refresh every gallery view (admin list, parent feed, event detail) so
    // newly uploaded/tagged photos show up without a manual pull-to-refresh.
    queryClient.invalidateQueries({ queryKey: ["gallery"] });
  };

  // Keeps the open review modal and the event list in sync without a refetch —
  // the parent-facing feed picks it up from the invalidate on close.
  const handleCaptionSaved = (caption: string | null) => {
    setReviewEvent((prev) => (prev ? { ...prev, caption } : prev));
    queryClient.setQueryData(["gallery", "admin"], (old: typeof data) =>
      old
        ? {
            ...old,
            events: old.events.map((e) =>
              e.id === reviewEvent?.id ? { ...e, caption } : e
            ),
          }
        : old
    );
  };

  const handleTagsChanged = (updated: Photo) => {
    setReviewPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setTagEditorPhoto(updated);
  };

  // Runs entirely while the (already fully open) review modal stays on screen —
  // launching the system picker right after *closing* a custom modal is an iOS/RN
  // race that can silently no-op, so this button only ever fires from a settled screen.
  const handleAddPhotos = async () => {
    if (!reviewEvent) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t.common.permissionNeeded, t.gallery.allowPhotoLibrary, [{ text: t.common.ok }]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    const assets = result.assets;
    setUploads(assets.map((asset) => ({ uri: asset.uri, progress: 0, status: "pending" })));

    let uploadedCount = 0;
    for (let i = 0; i < assets.length; i++) {
      setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, status: "uploading" } : u)));
      try {
        const photo = await uploadEventPhoto(reviewEvent.id, assets[i], (percent) => {
          setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, progress: percent } : u)));
        });
        uploadedCount += 1;
        setReviewPhotos((prev) => [photo, ...prev]);
        setUploads((prev) =>
          prev.map((u, idx) => (idx === i ? { ...u, status: "done", progress: 100 } : u))
        );
      } catch {
        setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, status: "error" } : u)));
      }
    }

    setUploads([]);
    if (uploadedCount > 0) {
      queryClient.setQueryData(["gallery", "admin"], (old: typeof data) =>
        old
          ? {
              ...old,
              events: old.events.map((e) =>
                e.id === reviewEvent.id ? { ...e, photoCount: e.photoCount + uploadedCount } : e
              ),
            }
          : old
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenFadeIn>
      <StepsHeader title={t.gallery.pageTitle} subtitle={t.gallery.adminSubtitle} />

      <Text style={[styles.sectionTitle, rtlText]}>{t.gallery.eventsSectionTitle}</Text>

      {isError ? (
        <>
          <EmptyState
            emoji="⚠️"
            title={t.gallery.couldntLoadGalleryData}
            subtitle={t.gallery.pullToRefresh}
          />
          <StepsButton
            label={t.gallery.refresh}
            variant="outline"
            onPress={() => reload()}
            style={styles.refreshButton}
          />
        </>
      ) : !data ? (
        <SkeletonEventList />
      ) : events.length === 0 ? (
        <>
          <EmptyState title={t.gallery.noEventsYet} subtitle={t.gallery.noEventsSubtitle} />
          <StepsButton
            label={t.gallery.refresh}
            variant="outline"
            onPress={() => reload()}
            style={styles.refreshButton}
          />
        </>
      ) : (
        events.map((event, index) => (
          <StepsCard
            key={event.id}
            onPress={() => openEventForReview(event)}
            style={styles.eventCard}
          >
            <View
              style={[
                styles.eventAccentBar,
                isRTL ? styles.accentBarRTL : styles.accentBarLTR,
                { backgroundColor: EVENT_BORDER_COLORS[index % EVENT_BORDER_COLORS.length] },
              ]}
            />
            <View style={[styles.eventRow, isRTL && styles.rowReverse]}>
              <View style={styles.eventTextBlock}>
                <Text style={[styles.eventName, rtlText]}>{event.name}</Text>
                {event.photoCount === 0 ? (
                  <Text style={[styles.eventEmptyMeta, rtlText]}>{t.gallery.noPhotosYetCard}</Text>
                ) : (
                  <Text style={[styles.eventMeta, rtlText]}>
                    {t.gallery.eventMeta(
                      formatIsoDate(event.date, t),
                      event.photoCount,
                      event.attendees.length
                    )}
                  </Text>
                )}
              </View>
              <Text style={styles.eventChevron}>{isRTL ? "‹" : "›"}</Text>
            </View>
            {/* Preview strip so the admin can recognise an event at a glance
                instead of reading a list of names. */}
            {event.previewUrls.length > 0 ? (
              <View style={[styles.previewRow, isRTL && styles.rowReverse]}>
                {event.previewUrls.map((url) => (
                  <Image key={url} source={{ uri: url }} style={styles.previewThumb} />
                ))}
                {event.photoCount > event.previewUrls.length ? (
                  <View style={[styles.previewThumb, styles.previewMore]}>
                    <Text style={styles.previewMoreText}>
                      +{event.photoCount - event.previewUrls.length}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </StepsCard>
        ))
      )}

      <StepsButton
        label={t.gallery.uploadPhotos}
        onPress={() => setIsPickerVisible(true)}
        style={styles.uploadButton}
      />
      </ScreenFadeIn>

      <EventPickerModal
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        events={events}
        students={students}
        onSelectExisting={handleEventSelected}
        onCreated={handleEventCreated}
      />

      {reviewEvent ? (
        <ReviewGridModal
          event={reviewEvent}
          photos={reviewPhotos}
          uploads={uploads}
          onAddPhotos={handleAddPhotos}
          onClose={closeReview}
          onOpenTag={setTagEditorPhoto}
          onCaptionSaved={handleCaptionSaved}
        />
      ) : null}

      <TagEditorModal
        photo={tagEditorPhoto}
        suggestions={students}
        onClose={() => setTagEditorPhoto(null)}
        onTagsChanged={handleTagsChanged}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  uploadButton: {
    marginTop: 24,
  },
  sectionTitle: {
    ...Type.heading,
    color: Colors.textLight,
    marginTop: 28,
    marginBottom: 12,
  },
  eventCard: {
    marginBottom: 10,
    borderRadius: 16,
  },
  eventAccentBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 6,
  },
  accentBarLTR: {
    left: 0,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  accentBarRTL: {
    right: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  eventTextBlock: {
    flex: 1,
  },
  eventName: {
    ...Type.body,
    fontFamily: Fonts.bold,
    color: Colors.text,
  },
  eventMeta: {
    ...Type.caption,
    color: Colors.textLight,
    marginTop: 2,
  },
  eventEmptyMeta: {
    ...Type.caption,
    fontStyle: "italic",
    color: Colors.textLight,
    marginTop: 2,
  },
  eventChevron: {
    fontSize: 22,
    color: Colors.textLight,
  },
  previewRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },
  previewThumb: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  previewMore: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.border,
  },
  previewMoreText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textLight,
  },
  refreshButton: {
    marginTop: 16,
    alignSelf: "center",
  },
});
