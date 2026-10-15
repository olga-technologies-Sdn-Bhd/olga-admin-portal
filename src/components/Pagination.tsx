import { useState } from 'react';

export function usePagination<T>(rows: T[], pageSize = 20) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  // Clamp when filters shrink the result set.
  const current = Math.min(page, pageCount);
  return {
    pageRows: rows.slice((current - 1) * pageSize, current * pageSize),
    page: current, pageCount, total: rows.length, pageSize, setPage,
  };
}

export function Pagination({ page, pageCount, total, pageSize, setPage }: Omit<ReturnType<typeof usePagination>, 'pageRows'>) {
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="muted">{from}–{to} of {total}</span>
      <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
      <button className="btn" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Next</button>
    </nav>
  );
}
