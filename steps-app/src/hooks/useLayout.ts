import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Every measurement a screen needs to fit the device it is actually on.
 *
 * `useWindowDimensions` is a hook, so it re-renders on rotation, split screen
 * and a foldable opening — a module-scope `Dimensions.get()` would freeze at
 * whatever the screen was when the bundle loaded.
 *
 * `fontScale` matters as much as width: a parent with large text enabled gets
 * the same layout with much taller text, which is what overflows cards.
 */
export function useLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // 380 is where a two-column card grid stops being able to show a date
  // without ellipsising it; 600 is where a phone layout starts looking
  // stretched rather than generous.
  const isNarrow = width < 380;
  const isWide = width >= 600;

  const gutter = isNarrow ? 16 : 20;

  return {
    width,
    height,
    fontScale,
    insets,
    isNarrow,
    isWide,
    gutter,
    cardGap: isNarrow ? 10 : 12,
    columns: isNarrow ? 1 : 2,
    /** Horizontal padding that also clears a notch in landscape. */
    sideInset: {
      paddingLeft: Math.max(gutter, insets.left),
      paddingRight: Math.max(gutter, insets.right),
    },
    /** Tablets: stop content sprawling to the full width of the screen. */
    maxContentWidth: isWide ? 600 : undefined,
  };
}

/**
 * Width of one card in a grid, computed rather than expressed as a percentage.
 *
 * Percentage widths combined with `gap` are what produced uneven tiles
 * elsewhere in this app: the percentage is of the container, the gap is added
 * on top, and the last column overflows by a few pixels.
 */
export function gridCardWidth({
  width,
  gutter,
  cardGap,
  columns,
}: {
  width: number;
  gutter: number;
  cardGap: number;
  columns: number;
}): number {
  const available = width - gutter * 2;
  if (columns <= 1) return available;
  return Math.floor((available - cardGap * (columns - 1)) / columns);
}
