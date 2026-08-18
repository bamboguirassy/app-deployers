import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface SearchMeta {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
}

interface SearchResponse<T, K> {
    data: T[];
    meta: SearchMeta;
    kpis: K;
}

/**
 * Drives a list page against a POST "search" endpoint that accepts a free-form
 * combination of search/filters/sort and returns { data, meta, kpis }.
 * Filter/sort/search changes reset to page 1; scrolling near the bottom appends
 * the next page (infinite scroll).
 */
export function useListSearch<T, K>(
    url: string,
    initialItems: T[],
    initialKpis: K,
    defaults: { sort?: string; direction?: 'asc' | 'desc' } = {},
) {
    const [items, setItems] = useState<T[]>(initialItems);
    const [kpis, setKpis] = useState<K>(initialKpis);
    const [search, setSearch] = useState('');
    const [filters, setFiltersState] = useState<Record<string, unknown>>({});
    const [sort, setSort] = useState<string | undefined>(defaults.sort);
    const [direction, setDirection] = useState<'asc' | 'desc'>(defaults.direction ?? 'desc');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const sentinelRef = useRef<HTMLDivElement>(null);
    const requestId = useRef(0);
    // Synchronous guard — avoids the race where loadMore fires before setLoading(true)
    // has propagated through React's render cycle.
    const loadingRef = useRef(false);
    const pageRef = useRef(1);
    const lastPageRef = useRef(1);

    // Keep refs in sync with state so the stable observer callback reads fresh values.
    pageRef.current = page;
    lastPageRef.current = lastPage;

    const fetchPage = useCallback(
        (targetPage: number, append: boolean) => {
            const id = ++requestId.current;
            loadingRef.current = true;
            setLoading(true);

            axios
                .post<SearchResponse<T, K>>(url, { search, ...filters, sort, direction, page: targetPage })
                .then(({ data }) => {
                    if (id !== requestId.current) return;
                    setItems((prev) => (append ? [...prev, ...data.data] : data.data));
                    setKpis(data.kpis);
                    setPage(data.meta.current_page);
                    setLastPage(data.meta.last_page);
                    setTotal(data.meta.total);
                })
                .finally(() => {
                    if (id === requestId.current) {
                        loadingRef.current = false;
                        setLoading(false);
                    }
                });
        },
        [url, search, filters, sort, direction],
    );

    // Stable ref so the IntersectionObserver always calls the latest version
    // without needing to be recreated.
    const loadMoreRef = useRef<() => void>(() => {});
    loadMoreRef.current = () => {
        if (loadingRef.current || pageRef.current >= lastPageRef.current) return;
        fetchPage(pageRef.current + 1, true);
    };

    // Reset to page 1 whenever filters/search/sort change.
    useEffect(() => {
        const timeout = setTimeout(() => fetchPage(1, false), 300);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, filters, sort, direction]);

    // Create the IntersectionObserver once — never recreated, so the sentinel
    // being in-viewport after a page load doesn't trigger a cascade of requests.
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting) loadMoreRef.current(); },
            { rootMargin: '200px' },
        );
        observer.observe(el);
        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setFilter = useCallback((key: string, value: unknown) => {
        setFiltersState((prev) => {
            const next = { ...prev };
            if (value === null || value === undefined || value === '') {
                delete next[key];
            } else {
                next[key] = value;
            }
            return next;
        });
    }, []);

    const resetFilters = useCallback(() => {
        setSearch('');
        setFiltersState({});
        setSort(defaults.sort);
        setDirection(defaults.direction ?? 'desc');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const hasActiveFilters =
        search !== '' ||
        Object.keys(filters).length > 0 ||
        sort !== defaults.sort ||
        direction !== (defaults.direction ?? 'desc');

    const refresh = useCallback(() => fetchPage(1, false), [fetchPage]);

    return {
        items,
        kpis,
        loading,
        hasMore: page < lastPage,
        total,
        sentinelRef,
        refresh,
        search,
        setSearch,
        filters,
        setFilter,
        sort,
        setSort,
        direction,
        setDirection,
        resetFilters,
        hasActiveFilters,
    };
}
