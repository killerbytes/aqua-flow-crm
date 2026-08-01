export interface Pagination {
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface Paginated<T> {
  rows: T[];
  pagination: Pagination;
}
