import { Screen } from "../../../components/Screen";
import { AdminGalleryScreen } from "../../../components/gallery/AdminGalleryScreen";
import { ParentGalleryScreen } from "../../../components/gallery/ParentGalleryScreen";
import { useIsAdmin } from "../../../hooks/useRole";

export default function GalleryScreen() {
  const isAdmin = useIsAdmin();

  return <Screen>{isAdmin ? <AdminGalleryScreen /> : <ParentGalleryScreen />}</Screen>;
}
