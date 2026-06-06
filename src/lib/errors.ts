import axios from 'axios';

/**
 * Normalizes any thrown value into a user-facing message.
 * - Axios errors: NestJS `{ statusCode, message, error }` shape → `response.data.message`.
 * - Plain Error (e.g. the S3 PUT fetch step): `error.message`.
 * - Anything else: Korean fallback.
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string' && message) return message;
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '알 수 없는 오류가 발생했습니다';
}
