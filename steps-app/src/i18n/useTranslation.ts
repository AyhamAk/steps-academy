import { TextStyle } from "react-native";

import { isRTLLocale, useLocaleStore } from "../store/localeStore";
import { ar, en, he } from "./translations";

const dictionaries = { en, ar, he };

const RTL_TEXT: Pick<TextStyle, "textAlign" | "writingDirection"> = {
  textAlign: "right",
  writingDirection: "rtl",
};
const LTR_TEXT: Pick<TextStyle, "textAlign" | "writingDirection"> = {
  textAlign: "left",
  writingDirection: "ltr",
};

export function useTranslation() {
  const locale = useLocaleStore((state) => state.locale);
  const isRTL = isRTLLocale(locale);
  return {
    t: dictionaries[locale],
    locale,
    isRTL,
    // Spread onto any left-aligned title/label so it right-aligns in Arabic.
    // (Expo Go doesn't honor native I18nManager RTL, so we align in JS.)
    rtlText: isRTL ? RTL_TEXT : LTR_TEXT,
  };
}
