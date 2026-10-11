import { Translations } from "../../i18n/translations";
import { WEEK_DAYS, WeekDay } from "../../services/scheduleApi";

/**
 * Time helpers shared by the day selector and the timeline.
 *
 * Lifted out of the old Home section when the schedule moved to the nursery
 * screen, so the two components can be composed separately without either
 * owning the clock.
 */

/** The academy runs Sunday–Thursday; Fri/Sat fall back to Sunday. */
export function todayAcademyDay(): WeekDay {
  return WEEK_DAYS[new Date().getDay()] ?? "sun";
}

/**
 * Calendar date for each academy day in the current academy week. Once the
 * week ends (Friday and Saturday) that is the coming week, which is the one
 * the manager is preparing and parents are looking ahead to.
 */
export function datesForThisWeek(): Record<WeekDay, number> {
  const now = new Date();
  const weekIsOver = now.getDay() >= 5;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay() + (weekIsOver ? 7 : 0));

  const dates = {} as Record<WeekDay, number>;
  WEEK_DAYS.forEach((day, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    dates[day] = date.getDate();
  });
  return dates;
}

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "2026-10-11" as a local date, so no timezone can shift the day. */
function fromIso(weekStart: string): Date {
  const [year, month, day] = weekStart.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * The Sunday ("YYYY-MM-DD") of the current academy week, the same week
 * `datesForThisWeek` shows. The server picks the same one when asked for none.
 */
export function currentWeekStart(): string {
  const now = new Date();
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  sunday.setDate(sunday.getDate() - now.getDay() + (now.getDay() >= 5 ? 7 : 0));
  return toIso(sunday);
}

export function addWeeks(weekStart: string, weeks: number): string {
  const date = fromIso(weekStart);
  date.setDate(date.getDate() + weeks * 7);
  return toIso(date);
}

/** The week's Sunday and Thursday as day-of-month and month index. */
export function weekBounds(weekStart: string) {
  const sunday = fromIso(weekStart);
  const thursday = new Date(sunday);
  thursday.setDate(sunday.getDate() + 4);
  return {
    from: { day: sunday.getDate(), month: sunday.getMonth() },
    to: { day: thursday.getDate(), month: thursday.getMonth() },
  };
}

export function monthYearOf(weekStart: string) {
  const date = fromIso(weekStart);
  return { month: date.getMonth(), year: date.getFullYear() };
}

/** Minutes since midnight, the unit the now marker is positioned in. */
export function minutesNow(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function toMinutes(startTime: string): number {
  const [hour, minute] = startTime.split(":");
  return Number(hour) * 60 + Number(minute);
}

/**
 * Whether the selected day sits behind today in the academy week.
 *
 * On Friday and Saturday `todayAcademyDay()` reports Sunday, so nothing is
 * behind it and every day reads as still to come — which is right: the week
 * has not started again yet.
 */
export function dayIsOver(selected: WeekDay, today: WeekDay): boolean {
  return WEEK_DAYS.indexOf(selected) < WEEK_DAYS.indexOf(today);
}

/** "11 – 15 أكتوبر" / "Oct 11 – 15" / "11 – 15 באוקטובר": Sunday to Thursday. */
export function formatWeekRange(weekStart: string, t: Translations): string {
  const { from, to } = weekBounds(weekStart);
  return t.scheduleAdmin.weekRange(
    { day: from.day, month: t.common.months[from.month] },
    { day: to.day, month: t.common.months[to.month] }
  );
}

/** "أكتوبر 2025", for when a template was saved. */
export function formatMonthYear(weekStart: string, t: Translations): string {
  const { month, year } = monthYearOf(weekStart);
  return t.scheduleAdmin.monthYear(t.common.months[month], year);
}
