import { Tip as PrismaTip } from "@prisma/client";

import { prisma } from "../lib/prisma";

export type Tip = PrismaTip;

export type CreateTipInput = {
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

export type UpdateTipInput = Partial<CreateTipInput>;

/** Newest month first — the head of the list is what the screen features. */
const NEWEST_FIRST = [{ year: "desc" as const }, { month: "desc" as const }];

export const TipModel = {
  async create(input: CreateTipInput & { createdBy: string }): Promise<Tip> {
    return prisma.tip.create({
      data: {
        emoji: input.emoji ?? "💡",
        title: input.title.trim(),
        titleAr: input.titleAr ?? null,
        titleHe: input.titleHe ?? null,
        excerpt: input.excerpt ?? null,
        excerptAr: input.excerptAr ?? null,
        excerptHe: input.excerptHe ?? null,
        body: input.body,
        bodyAr: input.bodyAr ?? null,
        bodyHe: input.bodyHe ?? null,
        month: input.month,
        year: input.year,
        minutes: input.minutes ?? 3,
        isPublished: input.isPublished ?? false,
        createdBy: input.createdBy,
      },
    });
  },

  async update(id: string, input: UpdateTipInput): Promise<Tip | null> {
    const existing = await prisma.tip.findUnique({ where: { id } });
    if (!existing) return null;

    // Only the keys actually sent are written, so a partial edit cannot blank
    // a translation the admin did not open.
    return prisma.tip.update({
      where: { id },
      data: {
        ...(input.emoji !== undefined ? { emoji: input.emoji } : {}),
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.titleAr !== undefined ? { titleAr: input.titleAr } : {}),
        ...(input.titleHe !== undefined ? { titleHe: input.titleHe } : {}),
        ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
        ...(input.excerptAr !== undefined ? { excerptAr: input.excerptAr } : {}),
        ...(input.excerptHe !== undefined ? { excerptHe: input.excerptHe } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.bodyAr !== undefined ? { bodyAr: input.bodyAr } : {}),
        ...(input.bodyHe !== undefined ? { bodyHe: input.bodyHe } : {}),
        ...(input.month !== undefined ? { month: input.month } : {}),
        ...(input.year !== undefined ? { year: input.year } : {}),
        ...(input.minutes !== undefined ? { minutes: input.minutes } : {}),
        ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
      },
    });
  },

  async remove(id: string): Promise<boolean> {
    const existing = await prisma.tip.findUnique({ where: { id } });
    if (!existing) return false;
    await prisma.tip.delete({ where: { id } });
    return true;
  },

  /** Everything, drafts included. Admin only. */
  async listAll(): Promise<Tip[]> {
    return prisma.tip.findMany({ orderBy: NEWEST_FIRST });
  },

  /**
   * What a parent sees: published tips only, each carrying whether this
   * account has read it.
   */
  async listPublished(userId: string): Promise<(Tip & { read: boolean })[]> {
    const tips = await prisma.tip.findMany({
      where: { isPublished: true },
      orderBy: NEWEST_FIRST,
      include: { reads: { where: { userId }, select: { userId: true } } },
    });
    return tips.map(({ reads, ...tip }) => ({ ...tip, read: reads.length > 0 }));
  },

  async findById(id: string): Promise<Tip | null> {
    return prisma.tip.findUnique({ where: { id } });
  },

  /** Idempotent: opening the same tip twice is not an error. */
  async markRead(tipId: string, userId: string): Promise<void> {
    await prisma.tipRead.upsert({
      where: { tipId_userId: { tipId, userId } },
      create: { tipId, userId },
      update: {},
    });
  },
};
