import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import {
  api,
  type CreateCatDto,
  type Photo,
  type PhotoPage,
  type UpdatePhotoDto,
} from '@/lib/apis/api-client';
import {
  convertHeicToJpeg,
  defaultTakenAt,
  isMediaSettling,
  looksLikeHeic,
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

const PHOTOS_PAGE_SIZE = 50;

export function useInfinitePhotos(ownerId?: string) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.CAT_PHOTOS.PHOTOS(ownerId),
    queryFn: ({ pageParam }) => api.catPhotos.photos.list(ownerId, pageParam, PHOTOS_PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!ownerId,
    // Poll only while something across the loaded pages is still processing.
    refetchInterval: (query) => {
      const data = query.state.data as InfiniteData<PhotoPage> | undefined;
      const settling = data?.pages.some((p) => p.items.some(isMediaSettling)) ?? false;
      return settling ? POLL_INTERVAL_MS : false;
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
  | 'converting'
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
      // HEIC/HEIF → JPEG before anything else: browsers can't decode HEIC and
      // the backend doesn't convert it (mirrors the mobile app). Keep the
      // original file around for the takenAt default (the converted file's
      // lastModified would be "now").
      let uploadFile = file;
      if (looksLikeHeic(file)) {
        onPhase?.('converting');
        uploadFile = await convertHeicToJpeg(file);
      }

      onPhase?.('reading');
      await validateUploadFile(uploadFile);
      const meta = uploadFile.type.startsWith('video')
        ? await readVideoMeta(uploadFile)
        : await readImageDimensions(uploadFile);

      onPhase?.('presigning');
      const presign = await api.catPhotos.photos.getUploadUrl({
        mimeType: uploadFile.type,
        sizeBytes: uploadFile.size,
        ownerId,
      });

      onPhase?.('uploading');
      await api.catPhotos.photos.uploadToS3(presign.uploadUrl, uploadFile);

      onPhase?.('confirming');
      const photo = await api.catPhotos.photos.confirm(presign.photoId, {
        key: presign.key,
        width: meta.width,
        height: meta.height,
        takenAt: takenAt || defaultTakenAt(file),
        originalFileName: uploadFile.name,
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
