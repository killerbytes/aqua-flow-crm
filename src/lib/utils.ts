import { env } from "@/backend/db/env";
import { clsx, type ClassValue } from "clsx";
import { format, isValid } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  date: string | number | Date | undefined,
  formatStr: string = "MM/dd/yyyy",
) {
  if (!date) return "N/A";
  return format(Number(date), formatStr);
}

export function formatDateTime(
  date: string | number | Date | null | undefined,
  formatStr: string = "MM/dd/yyyy h:mm a",
): string {
  if (date === null || date === undefined || date === "") return "N/A";

  // Handle Date, Unix timestamps (numbers), and ISO strings
  const parsedDate = date instanceof Date ? date : new Date(Number(date));

  // Safely check for invalid date strings (e.g., "invalid-date")
  if (!isValid(parsedDate)) return "N/A";

  return format(parsedDate, formatStr);
}

export function formatCurrency(value: number | string | undefined) {
  if (!value) return "N/A";
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: env.NEXT_PUBLIC_CURRENCY || "PHP",
  });
  const parts = formatter.formatToParts(Number(value));
  return parts
    .map((part) => {
      if (part.type === "currency") {
        return "P"; // Force single capital 'P'
      }
      return part.value;
    })
    .join("");
}

export const getInitials = (name: string) => {
  const names = name.split(" ");
  let initials = names[0].substring(0, 1).toUpperCase();
  if (names.length > 1) {
    initials += names[1].substring(0, 1).toUpperCase();
  }
  return initials;
};
