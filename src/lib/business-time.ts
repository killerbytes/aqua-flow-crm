import { addDays, endOfDay, startOfDay } from "date-fns";
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
