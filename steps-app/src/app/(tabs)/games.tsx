import { ComingSoonScreen } from "../../components/ComingSoonScreen";
import { useTranslation } from "../../i18n/useTranslation";
import { useChildren } from "../../store/authStore";

export default function GamesScreen() {
  const { t } = useTranslation();
  // The real linked child, so the teaser greets them by name rather than a
  // placeholder from a mock file.
  const childName = useChildren()[0]?.name ?? null;

  return (
    <ComingSoonScreen
      heroEmoji="🎮"
      heading={t.games.comingHeading}
      subtext={childName ? t.games.comingSubtext(childName) : t.games.comingSubtextGeneric}
      previews={[
        { emoji: "🔢", label: t.games.previewNumbers },
        { emoji: "🔤", label: t.games.previewLetters },
        { emoji: "🎨", label: t.games.previewColors },
        { emoji: "🐾", label: t.games.previewAnimals },
      ]}
      notifyLabel={t.games.notifyMe}
      notifyToast={t.games.notifyToast}
    />
  );
}
