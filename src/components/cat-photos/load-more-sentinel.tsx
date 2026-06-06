'use client';

import { useEffect, useRef } from 'react';

interface LoadMoreSentinelProps {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

/**
 * Renders an invisible sentinel that triggers `onLoadMore` when it scrolls into
 * view. Used for cursor-based infinite scrolling of the photos table.
 */
export function LoadMoreSentinel({ hasMore, loading, onLoadMore }: LoadMoreSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading) {
          onLoadMore();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (!hasMore && !loading) return null;

  return (
    <div ref={ref} className="flex h-12 items-center justify-center text-sm text-muted-foreground">
      {loading ? '불러오는 중...' : '스크롤하여 더 보기'}
    </div>
  );
}
