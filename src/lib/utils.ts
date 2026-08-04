import { clsx, type ClassValue } from "clsx";
import { format, isValid } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | number | Date | undefined) {
  if (!date) return "N/A";
  return new Date(Number(date)).toLocaleDateString();
}

export function formatDateTime(
  date: string | number | Date | null | undefined,
  formatStr: string = "dd/MM/yyyy h:mm a",
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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: process.env.NEXT_PUBLIC_CURRENCY || "PHP",
  }).format(Number(value));
}

export function getErrorMessage(err: unknown): string {
  let rawMessage: string | undefined;

  if (err && typeof err === "object") {
    const responseErrors = (err as any)?.response?.errors;
    if (
      Array.isArray(responseErrors) &&
      responseErrors.length > 0 &&
      responseErrors[0]?.message
    ) {
      rawMessage = responseErrors[0].message;
    } else {
      const graphqlErrors = (err as any)?.errors;
      if (
        Array.isArray(graphqlErrors) &&
        graphqlErrors.length > 0 &&
        graphqlErrors[0]?.message
      ) {
        rawMessage = graphqlErrors[0].message;
      } else if (
        "message" in err &&
        typeof (err as { message: unknown }).message === "string"
      ) {
        rawMessage = (err as { message: string }).message;
      }
    }
  } else if (typeof err === "string") {
    rawMessage = err;
  }

  if (rawMessage) {
    // 1. Try extracting inner Zod "message": "..." field via regex first
    const zodMessageMatch = rawMessage.match(
      /"message":\s*"((?:[^"\\]|\\.)*)"/,
    );
    if (zodMessageMatch && zodMessageMatch[1]) {
      try {
        return JSON.parse(`"${zodMessageMatch[1]}"`);
      } catch {
        return zodMessageMatch[1].replace(/\\"/g, '"');
      }
    }

    // 2. Try parsing JSON substring if rawMessage contains a JSON array/object
    const firstBracket = rawMessage.indexOf("[");
    const firstBrace = rawMessage.indexOf("{");
    const jsonStart =
      firstBracket !== -1 && firstBrace !== -1
        ? Math.min(firstBracket, firstBrace)
        : firstBracket !== -1
          ? firstBracket
          : firstBrace;

    if (jsonStart !== -1) {
      const candidate = rawMessage.slice(jsonStart);
      const lastBracket = candidate.lastIndexOf("]");
      const lastBrace = candidate.lastIndexOf("}");
      const jsonEnd = Math.max(lastBracket, lastBrace);

      if (jsonEnd !== -1) {
        try {
          const parsed = JSON.parse(candidate.slice(0, jsonEnd + 1));
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            parsed[0]?.message
          ) {
            return parsed[0].message;
          }
          if (parsed && typeof parsed === "object" && parsed.message) {
            return parsed.message;
          }
        } catch {
          // Not valid JSON, continue with rawMessage
        }
      }
    }

    return rawMessage;
  }

  return "An unexpected error occurred";
}

export const getInitials = (name: string) => {
  const names = name.split(" ");
  let initials = names[0].substring(0, 1).toUpperCase();
  if (names.length > 1) {
    initials += names[1].substring(0, 1).toUpperCase();
  }
  return initials;
};
