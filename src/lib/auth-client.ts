import { inferAdditionalFields } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
  plugins: [
    // 백엔드 auth.ts의 user.additionalFields.role과 동기화 (별도 프로젝트이므로 수동 지정)
    inferAdditionalFields({
      user: {
        role: { type: 'string' },
      },
    }),
  ],
});

export type Session = (typeof authClient)['$Infer']['Session'];
