import { useEffect, useState } from 'react';

/** Client-side paging. The page resets to 1 whenever `resetKey` changes (search text, sort...). */
export function usePagination<T>(items: T[], pageSize: number, resetKey: unknown) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);

  useEffect(() => { setPage(1); }, [resetKey]);

  return { page: current, totalPages, setPage, pageItems: items.slice((current - 1) * pageSize, current * pageSize) };
}
