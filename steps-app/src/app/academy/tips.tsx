import { ComingSoonScreen } from "../../components/ComingSoonScreen";
import { useTranslation } from "../../i18n/useTranslation";

/** Placeholder — see the note in dafi.tsx. */
export default function ParentingTipsScreen() {
  const { t } = useTranslation();

  return (
    <ComingSoonScreen
      heroEmoji="💡"
      heading={t.academy.tipsHeading}
      subtext={t.academy.tipsSubtext}
      previews={[
        { emoji: "🍎", label: t.home.tileTips },
        { emoji: "😴", label: t.home.tileTipsSubtitle },
        { emoji: "🧸", label: t.home.tileNursery },
      ]}
      notifyLabel={t.academy.notifyMe}
      notifyToast={t.academy.notifyToast}
    />
  );
}
