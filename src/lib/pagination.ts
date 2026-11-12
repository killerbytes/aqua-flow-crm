import { PAGINATION } from "./definitions";

/** Page and page size from a page's search params, with the app defaults. */
export const parsePageParams = (params?: {
  page?: unknown;
  limit?: unknown;
}) => ({
  page: Number(params?.page) || PAGINATION.PAGE,
  limit: Number(params?.limit) || PAGINATION.PAGE_SIZE,
});

/** The pagination block every list result carries. */
export const toPagination = (total: number, limit: number, page: number) => ({
  total,
  totalPages: Math.ceil(total / limit),
  currentPage: page,
});
