import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import {
  api,
  type CreateCatDto,
  type Photo,
  type PhotoPage,
  type UpdatePhotoDto,
} from '@/lib/apis/api-client';
import {
  defaultTakenAt,
  isMediaSettling,
  readImageDimensions,
  readVideoMeta,
  validateUploadFile,
} from '@/lib/cat-photos/media';

const POLL_INTERVAL_MS = 5000;

// ── Queries ─────────────────────────────────────────────────────────────────
export function useGalleries() {
  return useQuery({
    queryKey: QUERY_KEYS.CAT_PHOTOS.GALLERIES,
    queryFn: api.catPhotos.galleries.list,
  });
}

export function useShares() {
  return useQuery({
    queryKey: QUERY_KEYS.CAT_PHOTOS.SHARES,
    queryFn: api.catPhotos.galleries.listShares,
  });
}

export function useCats(ownerId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.CAT_PHOTOS.CATS(ownerId),
    queryFn: () => api.catPhotos.cats.list(ownerId),
    // Wait until a gallery is selected to avoid a redundant fetch against an
    // ambiguous "own gallery" and an orphan { ownerId: undefined } cache entry.
    enabled: !!ownerId,
  });
}

export function usePhotos(ownerId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.CAT_PHOTOS.PHOTOS(ownerId),
    queryFn: () => api.catPhotos.photos.list(ownerId, undefined, 100),
    enabled: !!ownerId,
    // Poll only while something is still processing; stop once everything settles.
    refetchInterval: (query) => {
      const page = query.state.data as PhotoPage | undefined;
      return page?.items.some(isMediaSettling) ? POLL_INTERVAL_MS : false;
    },
  });
}

export function usePhoto(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.CAT_PHOTOS.PHOTO(id ?? ''),
    queryFn: () => api.catPhotos.photos.get(id as string),
    enabled: enabled && !!id,
    refetchInterval: (query) => {
      const photo = query.state.data as Photo | undefined;
      return photo && isMediaSettling(photo) ? POLL_INTERVAL_MS : false;
    },
  });
}

// ── Upload orchestration ──────────────────────────────────────────────────
export type UploadPhase =
  | 'idle'
  | 'reading'
  | 'presigning'
  | 'uploading'
  | 'confirming'
  | 'processing';

export interface UploadPhotoVars {
  file: File;
  memo?: string;
  takenAt?: string;
  onPhase?: (phase: UploadPhase) => void;
}

export function useUploadPhoto(ownerId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, memo, takenAt, onPhase }: UploadPhotoVars) => {
      onPhase?.('reading');
      await validateUploadFile(file);
      const meta = file.type.startsWith('video')
        ? await readVideoMeta(file)
        : await readImageDimensions(file);

      onPhase?.('presigning');
      const presign = await api.catPhotos.photos.getUploadUrl({
        mimeType: file.type,
        sizeBytes: file.size,
        ownerId,
      });

      onPhase?.('uploading');
      await api.catPhotos.photos.uploadToS3(presign.uploadUrl, file);

      onPhase?.('confirming');
      const photo = await api.catPhotos.photos.confirm(presign.photoId, {
        key: presign.key,
        width: meta.width,
        height: meta.height,
        takenAt: takenAt || defaultTakenAt(file),
        originalFileName: file.name,
        memo: memo || undefined,
      });

      onPhase?.('processing');
      return photo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAT_PHOTOS.PHOTOS(ownerId) });
    },
  });
}

// ── Photo mutations ──────────────────────────────────────────────────────
function usePhotoInvalidation(ownerId?: string) {
  const queryClient = useQueryClient();
  return (photoId?: string) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAT_PHOTOS.PHOTOS(ownerId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAT_PHOTOS.CATS(ownerId) });
    if (photoId) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAT_PHOTOS.PHOTO(photoId) });
    }
  };
}

export function useUpdatePhoto(ownerId?: string) {
  const invalidate = usePhotoInvalidation(ownerId);
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePhotoDto }) =>
      api.catPhotos.photos.update(id, dto),
    onSuccess: (photo) => invalidate(photo.id),
  });
}

export function useRetryPhoto(ownerId?: string) {
  const invalidate = usePhotoInvalidation(ownerId);
  return useMutation({
    mutationFn: (id: string) => api.catPhotos.photos.retry(id),
    onSuccess: (photo) => invalidate(photo.id),
  });
}

export function useDeletePhoto(ownerId?: string) {
  const invalidate = usePhotoInvalidation(ownerId);
  return useMutation({
    mutationFn: (id: string) => api.catPhotos.photos.remove(id),
    onSuccess: () => invalidate(),
  });
}

export function useAddPhotoCat(ownerId?: string) {
  const invalidate = usePhotoInvalidation(ownerId);
  return useMutation({
    mutationFn: ({ photoId, catId }: { photoId: string; catId: string }) =>
      api.catPhotos.photos.addCat(photoId, catId),
    onSuccess: (photo) => invalidate(photo.id),
  });
}

export function useRemovePhotoCat(ownerId?: string) {
  const invalidate = usePhotoInvalidation(ownerId);
  return useMutation({
    mutationFn: ({ photoId, catId }: { photoId: string; catId: string }) =>
      api.catPhotos.photos.removeCat(photoId, catId),
    onSuccess: (photo) => invalidate(photo.id),
  });
}

// ── Cat mutations ────────────────────────────────────────────────────────
export function useCreateCat(ownerId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCatDto) => api.catPhotos.cats.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAT_PHOTOS.CATS(ownerId) });
    },
  });
}

export function useRenameCat(ownerId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.catPhotos.cats.rename(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAT_PHOTOS.CATS(ownerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAT_PHOTOS.PHOTOS(ownerId) });
    },
  });
}

export function useDeleteCat(ownerId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.catPhotos.cats.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAT_PHOTOS.CATS(ownerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAT_PHOTOS.PHOTOS(ownerId) });
    },
  });
}

export function useReindex(ownerId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.catPhotos.cats.reindex(ownerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAT_PHOTOS.PHOTOS(ownerId) });
    },
  });
}

// ── Share mutations ──────────────────────────────────────────────────────
export function useAddShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => api.catPhotos.galleries.addShare(email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAT_PHOTOS.SHARES });
    },
  });
}

export function useRemoveShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberUserId: string) => api.catPhotos.galleries.removeShare(memberUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAT_PHOTOS.SHARES });
    },
  });
}
