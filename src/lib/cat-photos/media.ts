import type { Photo } from '@/lib/apis/api-client';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const HEIC_TYPES = ['image/heic', 'image/heif'];

const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // 25MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200MB
const MAX_VIDEO_DURATION_MS = 60 * 1000; // 60s

// HEIC included so the file picker offers them; they are converted to JPEG
// client-side before upload (browsers can't decode HEIC and the backend's
// sharp(musl) build can't either — same approach as the mobile app).
export const ACCEPT_ATTR = [...IMAGE_TYPES, ...HEIC_TYPES, '.heic', '.heif', ...VIDEO_TYPES].join(
  ',',
);

const extOf = (name: string): string => name.split('.').pop()?.toLowerCase() ?? '';

/**
 * Cheap synchronous HEIC/HEIF check by mime or extension. Browsers often report
 * an empty `File.type` for HEIC, so the extension fallback matters. Used to
 * decide whether to run the (heavier) conversion before upload.
 */
export function looksLikeHeic(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (HEIC_TYPES.includes(mime)) return true;
  const ext = extOf(file.name);
  return ext === 'heic' || ext === 'heif';
}

const renameToJpg = (name: string): string =>
  name.includes('.') ? `${name.replace(/\.[^.]+$/, '')}.jpg` : `${name}.jpg`;

/**
 * Converts a HEIC/HEIF file to a JPEG File (quality 0.9, matching the mobile
 * app). `heic-to` (libheif WASM) is dynamically imported so its bundle is only
 * fetched when a HEIC file is actually selected.
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  const { heicTo } = await import('heic-to');
  const blob = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 });
  return new File([blob], renameToJpg(file.name), { type: 'image/jpeg' });
}

/**
 * Mirrors the backend polling helper: true while any pipeline stage for this
 * media is still settling (thumbnail/AI/cat-identify). Cat identify only
 * matters once the AI has confirmed a cat is present.
 */
export const isMediaSettling = (p: Photo): boolean =>
  p.procStatus === 'PENDING' ||
  p.procStatus === 'PROCESSING' ||
  p.aiStatus === 'PENDING' ||
  p.aiStatus === 'PROCESSING' ||
  (p.hasCat === true && (p.catStatus === 'PENDING' || p.catStatus === 'PROCESSING'));

export function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지 메타데이터를 읽을 수 없습니다'));
    };
    img.src = url;
  });
}

export function readVideoMeta(
  file: File,
): Promise<{ width: number; height: number; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const meta = {
        width: video.videoWidth,
        height: video.videoHeight,
        durationMs: Math.round(video.duration * 1000),
      };
      URL.revokeObjectURL(url);
      resolve(meta);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('영상 메타데이터를 읽을 수 없습니다'));
    };
    video.src = url;
  });
}

/**
 * Validates mime/size client-side and, for video, enforces the 60s limit by
 * reading container metadata. Throws an Error with a Korean message on failure.
 */
export async function validateUploadFile(file: File): Promise<void> {
  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    throw new Error('지원하지 않는 형식입니다 (이미지: jpeg/png/webp, 영상: mp4/mov)');
  }

  if (isImage && file.size > MAX_IMAGE_BYTES) {
    throw new Error('이미지는 최대 25MB까지 업로드할 수 있습니다');
  }

  if (isVideo) {
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error('영상은 최대 200MB까지 업로드할 수 있습니다');
    }
    const meta = await readVideoMeta(file);
    if (meta.durationMs > MAX_VIDEO_DURATION_MS) {
      throw new Error('영상 길이는 최대 60초까지 가능합니다');
    }
  }
}

/** Default takenAt from the file's last-modified time (EXIF parsing is out of scope). */
export function defaultTakenAt(file: File): string {
  return new Date(file.lastModified).toISOString();
}
