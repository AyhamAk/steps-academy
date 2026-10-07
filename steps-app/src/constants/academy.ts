// Academy contact details used by the "Contact the Academy" sheet.
export const ACADEMY_CONTACT = {
  // E.164 format for the phone dialer (tel:)
  phone: "+972506922239",
  // wa.me format — digits only, no "+" or spaces
  whatsapp: "972506922239",
  // A real, monitored inbox — it is printed on the public privacy and
  // account-deletion pages, so it must actually receive mail. Swap to
  // info@steps-academy.com once mail routing for the domain is set up, and
  // change ACADEMY_EMAIL on the API at the same time.
  email: "nagam_410@hotmail.com",
};

// Where a parent downloads the app. Defined once and shared by all three
// locales — the same two URLs written six times would drift apart the first
// time one of them changed.
export const STORE_LINKS = {
  // Matches `android.package` in app.json.
  android: "https://play.google.com/store/apps/details?id=com.stepsacademy.steps",
  // Matches `ascAppId` in eas.json.
  ios: "https://apps.apple.com/app/id6806549602",
};

// Manager accounts that get the manager/parent toggle on Home, to see what
// families see: the owner, the academy manager and the manager's helper. The
// server signs the same three numbers in as managers.
export const VIEW_SWITCH_PHONES = ["+972504315245", "+972506922239", "+972586589137"];
// Manager accounts with no phone on them that get the toggle too: Nagam signs
// in by email as well as by number.
export const VIEW_SWITCH_EMAILS = ["nagam@steps-academy.com"];
