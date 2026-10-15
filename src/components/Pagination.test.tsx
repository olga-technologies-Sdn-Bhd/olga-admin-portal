import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePagination } from './Pagination';

describe('usePagination', () => {
  const rows = Array.from({ length: 45 }, (_, i) => i);

  it('slices rows into pages', () => {
    const { result } = renderHook(() => usePagination(rows, 20));
    expect(result.current.pageRows).toHaveLength(20);
    expect(result.current.pageCount).toBe(3);
    act(() => result.current.setPage(3));
    expect(result.current.pageRows).toEqual([40, 41, 42, 43, 44]);
  });

  it('clamps the page when rows shrink', () => {
    const { result, rerender } = renderHook(({ r }) => usePagination(r, 20), { initialProps: { r: rows } });
    act(() => result.current.setPage(3));
    rerender({ r: rows.slice(0, 5) });
    expect(result.current.page).toBe(1);
    expect(result.current.pageRows).toHaveLength(5);
  });
});
