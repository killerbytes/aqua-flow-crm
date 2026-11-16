import { PAGINATION } from "./definitions";

/** A whole number above zero, or the fallback. Arrays and text don't count. */
const positiveInteger = (value: unknown, fallback: number) => {
  const number = Array.isArray(value) ? NaN : Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
};

/**
 * Page and page size from a page's search params, with the app defaults.
 * Anything but a whole number above zero gets the default, because the
 * database rejects a negative or fractional OFFSET and LIMIT.
 */
export const parsePageParams = (params?: {
  page?: unknown;
  limit?: unknown;
}) => ({
  page: positiveInteger(params?.page, PAGINATION.PAGE),
  limit: positiveInteger(params?.limit, PAGINATION.PAGE_SIZE),
});

/** The pagination block every list result carries. */
export const toPagination = (total: number, limit: number, page: number) => ({
  total,
  totalPages: Math.ceil(total / limit),
  currentPage: page,
});
