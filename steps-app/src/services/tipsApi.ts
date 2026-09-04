import { api } from "./api";

export type Tip = {
  id: string;
  emoji: string;
  /** The academy's own wording, and the fallback when a locale has none. */
  title: string;
  titleAr: string | null;
  titleHe: string | null;
  excerpt: string | null;
  excerptAr: string | null;
  excerptHe: string | null;
  body: string;
  bodyAr: string | null;
  bodyHe: string | null;
  /** 1–12 as a person writes it, not a JS month index. */
  month: number;
  year: number;
  minutes: number;
  isPublished: boolean;
  /** Only present on the parent list; the admin list has no reader. */
  read?: boolean;
};

export type TipInput = {
  emoji?: string;
  title: string;
  titleAr?: string | null;
  titleHe?: string | null;
  excerpt?: string | null;
  excerptAr?: string | null;
  excerptHe?: string | null;
  body: string;
  bodyAr?: string | null;
  bodyHe?: string | null;
  month: number;
  year: number;
  minutes?: number;
  isPublished?: boolean;
};

/** Published tips, newest month first, flagged with whether you have read them. */
export async function listTips() {
  const { data } = await api.get<{ tips: Tip[] }>("/api/tips");
  return data.tips;
}

/** Admin: every tip, drafts included. */
export async function listAllTips() {
  const { data } = await api.get<{ tips: Tip[] }>("/api/tips/all");
  return data.tips;
}

export async function createTip(input: TipInput) {
  const { data } = await api.post<{ tip: Tip }>("/api/tips", input);
  return data.tip;
}

export async function updateTip(tipId: string, input: Partial<TipInput>) {
  const { data } = await api.patch<{ tip: Tip }>(`/api/tips/${tipId}`, input);
  return data.tip;
}

export async function deleteTip(tipId: string) {
  await api.delete(`/api/tips/${tipId}`);
}

export async function markTipRead(tipId: string) {
  await api.post(`/api/tips/${tipId}/read`);
}
