import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Paginated<T> {
    data: T[];
    next_page_url: string | null;
}

/**
 * Appends subsequent pages to an initial Inertia paginated prop as the user
 * scrolls near the bottom, instead of a classic click-through pagination.
 */
export function useInfiniteScroll<T>(initial: Paginated<T>, propName: string) {
    const [items, setItems] = useState<T[]>(initial.data);
    const [nextPageUrl, setNextPageUrl] = useState(initial.next_page_url);
    const [loading, setLoading] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setItems(initial.data);
        setNextPageUrl(initial.next_page_url);
    }, [initial]);

    const loadMore = useCallback(() => {
        if (!nextPageUrl || loading) return;

        setLoading(true);

        router.get(
            nextPageUrl,
            {},
            {
                preserveState: true,
                preserveScroll: true,
                only: [propName],
                onSuccess: (page) => {
                    const next = page.props[propName] as unknown as Paginated<T>;
                    setItems((prev) => [...prev, ...next.data]);
                    setNextPageUrl(next.next_page_url);
                },
                onFinish: () => setLoading(false),
            },
        );
    }, [nextPageUrl, loading, propName]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => entries[0].isIntersecting && loadMore(),
            { rootMargin: '400px' },
        );

        observer.observe(el);

        return () => observer.disconnect();
    }, [loadMore]);

    return { items, sentinelRef, loading, hasMore: nextPageUrl !== null };
}
