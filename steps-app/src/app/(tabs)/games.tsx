import { ComingSoonScreen } from "../../components/ComingSoonScreen";
import { MOCK_CHILDREN } from "../../constants/mockData";
import { useTranslation } from "../../i18n/useTranslation";

export default function GamesScreen() {
  const { t } = useTranslation();
  const childName = MOCK_CHILDREN[0]?.name ?? null;

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
