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

/** Calendar date for each academy day in the week containing today. */
export function datesForThisWeek(): Record<WeekDay, number> {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());

  const dates = {} as Record<WeekDay, number>;
  WEEK_DAYS.forEach((day, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    dates[day] = date.getDate();
  });
  return dates;
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
