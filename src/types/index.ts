export interface Pagination {
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface Paginated<T, Summary = unknown> {
  rows: T[];
  pagination: Pagination;
  /** Totals for the whole list, where the list has them. */
  summary?: Summary;
}
