import { format, isValid } from 'date-fns';
import { looksLikeHeic } from './media';

const MIN_YEAR = 2000;
const MAX_YEAR = 2035;

/** Formats a value into a `datetime-local` input string (`yyyy-MM-dd'T'HH:mm`). */
export function toLocalInput(value: string | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return '';
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function buildLocalDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date | null {
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day, hour, minute, second);
  // Reject values that JS silently rolled over (e.g. month 02 day 31).
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return null;
  }
  return date;
}

function dateFromEpoch(ms: number): Date | null {
  const date = new Date(ms);
  if (!isValid(date)) return null;
  const year = date.getFullYear();
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  return date;
}

// Year anchored to 19xx/20xx so a long epoch number is never read as YYYYMMDD.
const DATETIME_COMPACT = /((?:19|20)\d{2})(\d{2})(\d{2})[_-]?(\d{2})(\d{2})(\d{2})/;
const DATETIME_DELIMITED = /((?:19|20)\d{2})-?(\d{2})-?(\d{2})[ _-](\d{2})[.:-](\d{2})[.:-](\d{2})/;
const DATE_COMPACT = /((?:19|20)\d{2})(\d{2})(\d{2})/;
const EPOCH_MS = /(?<!\d)(\d{13})(?!\d)/;
const EPOCH_SECONDS = /(?<!\d)(\d{10})(?!\d)/;

/**
 * Best-effort extraction of a capture timestamp from a filename. Patterns are
 * tried most-specific first; compact `YYYYMMDD` forms run before the epoch
 * timestamp forms so a 13-digit number is not misread as a date.
 */
export function parseDateFromFilename(name: string): Date | null {
  const compact = name.match(DATETIME_COMPACT);
  if (compact) {
    const date = buildLocalDate(
      Number(compact[1]),
      Number(compact[2]),
      Number(compact[3]),
      Number(compact[4]),
      Number(compact[5]),
      Number(compact[6]),
    );
    if (date) return date;
  }

  const delimited = name.match(DATETIME_DELIMITED);
  if (delimited) {
    const date = buildLocalDate(
      Number(delimited[1]),
      Number(delimited[2]),
      Number(delimited[3]),
      Number(delimited[4]),
      Number(delimited[5]),
      Number(delimited[6]),
    );
    if (date) return date;
  }

  const dateOnly = name.match(DATE_COMPACT);
  if (dateOnly) {
    const date = buildLocalDate(Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3]));
    if (date) return date;
  }

  const epochMs = name.match(EPOCH_MS);
  if (epochMs) {
    const date = dateFromEpoch(Number(epochMs[1]));
    if (date) return date;
  }

  const epochSeconds = name.match(EPOCH_SECONDS);
  if (epochSeconds) {
    const date = dateFromEpoch(Number(epochSeconds[1]) * 1000);
    if (date) return date;
  }

  return null;
}

function toValidDate(value: unknown): Date | null {
  if (value instanceof Date && isValid(value)) return value;
  return null;
}

interface ExifDateTags {
  DateTimeOriginal?: unknown;
  CreateDate?: unknown;
}

/** Reads the EXIF capture date from an image file. Returns null for non-images or on any failure. */
export async function readExifTakenAt(file: File): Promise<Date | null> {
  const isImage = file.type.startsWith('image/') || looksLikeHeic(file);
  if (!isImage) return null;
  try {
    const mod = await import('exifr');
    const parse = mod.parse ?? mod.default?.parse;
    const tags = (await parse(file, ['DateTimeOriginal', 'CreateDate'])) as ExifDateTags | null;
    return toValidDate(tags?.DateTimeOriginal) ?? toValidDate(tags?.CreateDate);
  } catch {
    return null;
  }
}

/** Infers a capture date from EXIF first, then the filename. */
export async function inferTakenAt(file: File): Promise<Date | null> {
  const fromExif = await readExifTakenAt(file);
  if (fromExif) return fromExif;
  return parseDateFromFilename(file.name);
}
