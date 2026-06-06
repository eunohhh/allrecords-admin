'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  CatSummary,
  GallerySummary,
  MediaStatus,
  Photo,
  ShareMember,
} from '@/lib/apis/api-client';

export function truncate(text: string | null | undefined, maxLength = 30): string {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

const STATUS_VARIANT: Record<MediaStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'outline',
  PROCESSING: 'secondary',
  DONE: 'default',
  FAILED: 'destructive',
};

const STATUS_LABEL: Record<MediaStatus, string> = {
  PENDING: '대기',
  PROCESSING: '처리중',
  DONE: '완료',
  FAILED: '실패',
};

export function StatusBadge({ label, status }: { label: string; status: MediaStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className="gap-0.5">
      {label} · {STATUS_LABEL[status]}
    </Badge>
  );
}

function Thumbnail({ photo }: { photo: Photo }) {
  if (!photo.thumbUrl) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
        처리중
      </div>
    );
  }
  return (
    <div className="relative h-12 w-12">
      {/* biome-ignore lint/performance/noImgElement: no next/image config; CDN-signed thumbnail URLs */}
      <img
        src={photo.thumbUrl}
        alt={photo.aiCaption || photo.memo || '사진 썸네일'}
        className="h-12 w-12 rounded object-cover"
      />
      {photo.mediaType === 'VIDEO' && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Play className="h-4 w-4 fill-white text-white drop-shadow" />
        </span>
      )}
    </div>
  );
}

const selectColumn = <T,>(): ColumnDef<T> => ({
  id: 'select',
  header: '',
  cell: ({ row, table }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => {
        table.resetRowSelection();
        row.toggleSelected(!!value);
      }}
      onClick={(e) => e.stopPropagation()}
      aria-label="Select row"
    />
  ),
  enableSorting: false,
  enableHiding: false,
});

export const photoColumns: ColumnDef<Photo>[] = [
  selectColumn<Photo>(),
  {
    id: 'thumb',
    header: '미리보기',
    cell: ({ row }) => <Thumbnail photo={row.original} />,
    enableSorting: false,
  },
  { accessorKey: 'mediaType', header: '유형' },
  {
    accessorKey: 'sortAt',
    header: '정렬일',
    cell: ({ row }) => format(new Date(row.getValue('sortAt')), 'yyyy-MM-dd HH:mm'),
  },
  {
    id: 'status',
    header: '상태',
    enableSorting: false,
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div className="flex flex-wrap gap-1">
          <StatusBadge label="썸네일" status={p.procStatus} />
          <StatusBadge label="AI" status={p.aiStatus} />
          {p.hasCat === true && <StatusBadge label="고양이" status={p.catStatus} />}
        </div>
      );
    },
  },
  {
    id: 'catNames',
    header: '고양이',
    enableSorting: false,
    cell: ({ row }) => row.original.catNames.join(', ') || '-',
  },
  {
    id: 'aiTags',
    header: '태그',
    enableSorting: false,
    cell: ({ row }) => truncate(row.original.aiTags.join(', '), 40) || '-',
  },
  {
    accessorKey: 'memo',
    header: '메모',
    cell: ({ row }) => truncate(row.getValue('memo')),
  },
];

function CatCover({ cat }: { cat: CatSummary }) {
  if (!cat.coverThumbUrl) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
        없음
      </div>
    );
  }
  return (
    // biome-ignore lint/performance/noImgElement: no next/image config; CDN-signed cover URLs
    <img
      src={cat.coverThumbUrl}
      alt={`${cat.name} 대표 사진`}
      className="h-12 w-12 rounded object-cover"
    />
  );
}

export const catColumns: ColumnDef<CatSummary>[] = [
  selectColumn<CatSummary>(),
  {
    id: 'cover',
    header: '대표',
    cell: ({ row }) => <CatCover cat={row.original} />,
    enableSorting: false,
  },
  { accessorKey: 'name', header: '이름' },
  { accessorKey: 'photoCount', header: '장수' },
];

export const shareColumns: ColumnDef<ShareMember>[] = [
  selectColumn<ShareMember>(),
  { accessorKey: 'email', header: '이메일' },
  { accessorKey: 'name', header: '이름' },
  {
    accessorKey: 'createdAt',
    header: '공유일',
    cell: ({ row }) => format(new Date(row.getValue('createdAt')), 'yyyy-MM-dd HH:mm'),
  },
];

export const galleryColumns: ColumnDef<GallerySummary>[] = [
  { accessorKey: 'ownerName', header: '사진첩 주인' },
  {
    id: 'isOwner',
    header: '구분',
    cell: ({ row }) =>
      row.original.isOwner ? <Badge>내 사진첩</Badge> : <Badge variant="secondary">공유받음</Badge>,
  },
  { accessorKey: 'ownerId', header: 'Owner ID' },
];
