export interface PagedResponse<T> {
  page: number;

  pageSize: number;

  totalCount: number;

  totalPages: number;

  data: T[];
}