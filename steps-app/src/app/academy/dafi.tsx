import { ComingSoonScreen } from "../../components/ComingSoonScreen";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * Placeholder. The Dafi path is a real academy programme, but it has no
 * content model in the app yet — the tile exists so the academy grid is whole
 * and parents can see what is coming.
 */
export default function DafiScreen() {
  const { t } = useTranslation();

  return (
    <ComingSoonScreen
      heroEmoji="🧭"
      heading={t.academy.dafiHeading}
      subtext={t.academy.dafiSubtext}
      previews={[
        { emoji: "📅", label: t.home.tileDafiSubtitle },
        { emoji: "🌱", label: t.home.tileNursery },
        { emoji: "🎓", label: t.home.tileCourses },
      ]}
      notifyLabel={t.academy.notifyMe}
      notifyToast={t.academy.notifyToast}
    />
  );
}
