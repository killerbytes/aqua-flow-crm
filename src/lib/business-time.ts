import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  startOfDay,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/** Business days follow Philippine time, whatever timezone the server runs in. */
export const BUSINESS_TIMEZONE = "Asia/Manila";

/**
 * Midnight that starts the Philippine day containing `date`, shifted by
 * `days` whole days, as a real instant.
 */
export const startOfBusinessDay = (date: Date, days = 0) =>
  fromZonedTime(
    addDays(startOfDay(toZonedTime(date, BUSINESS_TIMEZONE)), days),
    BUSINESS_TIMEZONE,
  );

/** The last millisecond of the Philippine day containing `date`. */
export const endOfBusinessDay = (date: Date) =>
  fromZonedTime(
    endOfDay(toZonedTime(date, BUSINESS_TIMEZONE)),
    BUSINESS_TIMEZONE,
  );

/** The Philippine calendar date of `date`, as YYYY-MM-DD. */
export const businessDateKey = (date: Date) =>
  formatInTimeZone(date, BUSINESS_TIMEZONE, "yyyy-MM-dd");

/**
 * The instant a Philippine calendar date (YYYY-MM-DD) begins, or null if the
 * text isn't a real date.
 */
export const parseBusinessDateKey = (key: unknown): Date | null => {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const start = fromZonedTime(`${key}T00:00:00`, BUSINESS_TIMEZONE);
  return !isNaN(start.getTime()) && businessDateKey(start) === key
    ? start
    : null;
};

/**
 * Whole Philippine calendar days from `from` to `to`. An order placed late
 * yesterday is one day old this morning, even though fewer than 24 hours passed.
 */
export const businessDaysBetween = (from: Date, to: Date) =>
  differenceInCalendarDays(
    toZonedTime(to, BUSINESS_TIMEZONE),
    toZonedTime(from, BUSINESS_TIMEZONE),
  );
