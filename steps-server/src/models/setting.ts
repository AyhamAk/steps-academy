import { prisma } from "../lib/prisma";

/** Academy-wide settings. Keys are namespaced so this stays readable as it grows. */
export const SETTING_KEYS = {
  galleryQuote: "gallery.quote",
} as const;

export const SettingModel = {
  async get(key: string): Promise<string | null> {
    const row = await prisma.appSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  },

  /** Empty or whitespace clears the setting rather than storing a blank. */
  async set(key: string, value: string | null): Promise<string | null> {
    const trimmed = value?.trim();
    if (!trimmed) {
      await prisma.appSetting.deleteMany({ where: { key } });
      return null;
    }
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value: trimmed },
      update: { value: trimmed },
    });
    return trimmed;
  },
};
