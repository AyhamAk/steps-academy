import { ComingSoonScreen } from "../../components/ComingSoonScreen";
import { useTranslation } from "../../i18n/useTranslation";

export default function ShopScreen() {
  const { t } = useTranslation();

  return (
    <ComingSoonScreen
      heroEmoji="🛍️"
      heading={t.shop.comingHeading}
      subtext={t.shop.comingSubtext}
      previews={[
        { emoji: "📚", label: t.shop.previewBooks },
        { emoji: "🎨", label: t.shop.previewArtSupplies },
        { emoji: "👕", label: t.shop.previewClothing },
        { emoji: "🧸", label: t.shop.previewToys },
      ]}
      notifyLabel={t.shop.notifyMe}
      notifyToast={t.shop.notifyToast}
    />
  );
}
