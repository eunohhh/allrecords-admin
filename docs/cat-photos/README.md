# 고양이 사진첩 (cat-photos) — 어드민 연동 문서

allrecords 백엔드에 새로 추가된 **고양이 사진첩** 기능을 이 어드민(Next.js)에서 이어 개발하기 위한 시작점 문서.

> 작성 시점 기준: 백엔드/앱 I0~I5(+I4.5) 완료, 프로덕션 배포됨.

## 문서 구성
- **[cat-photos-api.md](./cat-photos-api.md)** — 엔드포인트 전체 레퍼런스 + 복붙용 TypeScript 인터페이스.
- **[cat-photos-architecture.md](./cat-photos-architecture.md)** — 데이터 모델, 비동기 처리 파이프라인, 스토리지/CDN, 검색·고양이 식별·정렬 규칙.

## 한눈에 보기

| 영역 | 요약 |
|------|------|
| 인증 | 기존과 동일. `Authorization: Bearer <app_access_token>` (이 레포의 `axiosInstance` 인터셉터가 이미 처리). |
| 미디어 | 사진(jpeg/png/webp) + 영상(mp4/mov). 업로드는 **presign → S3 PUT → confirm** 3단계. |
| 비동기 | 업로드 후 썸네일·AI 분류·고양이 식별이 **백그라운드**로 진행. 상태 컬럼(`procStatus`/`aiStatus`/`catStatus`)을 폴링. |
| 표시 URL | 모든 이미지/영상은 **CloudFront 서명 URL**(`thumbUrl`/`previewUrl`/`videoUrl`). 만료(약 1시간, 시간 경계 라운딩)되므로 목록을 다시 받으면 갱신됨. |
| 소유/공유 | 사진첩은 **주인(userId)** 단위. `ownerId`로 다른 사람 사진첩(공유받은 것) 조회 가능. |
| AI | Gemini가 한국어 태그/캡션 + 고양이 이름(few-shot) 자동 생성. 검색은 키워드+의미(임베딩). |

## 베이스 URL / 인증
- `NEXT_PUBLIC_API_BASE_URL` (이미 `.env.local`에 설정).
- 토큰: `localStorage['app_access_token']` → `axiosInstance`가 자동으로 `Authorization` 헤더에 첨부.
- 모든 cat-photos 엔드포인트는 이 토큰의 사용자를 **호출자(caller)** 로 간주한다. `ownerId`를 생략하면 "내 사진첩".

## 이 레포에 붙이는 방법 (기존 패턴 그대로)

기존 sitting과 동일한 구조로 추가하면 됩니다:

1. **API 클라이언트** — `src/lib/apis/api-client.ts`에 `api.photos`, `api.galleries`, `api.cats` 네임스페이스 추가. (함수 시그니처는 [cat-photos-api.md](./cat-photos-api.md) 참고)
2. **쿼리 키** — `src/constants/query-keys.ts`에 `PHOTOS`, `GALLERIES`, `CATS` 추가.
3. **훅** — `src/hooks/queries.ts`에 `usePhotos`, `usePhotoSearch`, `useGalleries`, `useCats` 등 추가.

예시(스케치):
```ts
// src/lib/apis/api-client.ts
export const api = {
  // ...existing sitting...
  photos: {
    list: (params?: { ownerId?: string; cursor?: string; limit?: number }) =>
      axiosInstance.get<PhotoPage>('/photos', { params }).then((r) => r.data),
    get: (id: string) => axiosInstance.get<Photo>(`/photos/${id}`).then((r) => r.data),
    search: (params: { q: string; ownerId?: string; limit?: number }) =>
      axiosInstance.get<Photo[]>('/photos/search', { params }).then((r) => r.data),
    moments: (params?: { ownerId?: string }) =>
      axiosInstance.get<{ sections: MomentSection[] }>('/photos/moments', { params }).then((r) => r.data),
    updateMeta: (id: string, dto: { memo?: string; takenAt?: string }) =>
      axiosInstance.patch<Photo>(`/photos/${id}`, dto).then((r) => r.data),
    remove: (id: string) => axiosInstance.delete(`/photos/${id}`).then((r) => r.data),
    retry: (id: string) => axiosInstance.post<Photo>(`/photos/${id}/retry`).then((r) => r.data),
  },
  galleries: {
    list: () => axiosInstance.get<GallerySummary[]>('/galleries').then((r) => r.data),
    shares: () => axiosInstance.get<ShareMember[]>('/galleries/shares').then((r) => r.data),
    share: (email: string) => axiosInstance.post<ShareMember>('/galleries/shares', { email }).then((r) => r.data),
    revoke: (memberUserId: string) =>
      axiosInstance.delete(`/galleries/shares/${memberUserId}`).then((r) => r.data),
  },
  cats: {
    list: (ownerId?: string) =>
      axiosInstance.get<CatSummary[]>('/cats', { params: { ownerId } }).then((r) => r.data),
    create: (name: string, ownerId?: string) =>
      axiosInstance.post<CatSummary>('/cats', { name, ownerId }).then((r) => r.data),
    rename: (id: string, name: string) => axiosInstance.patch(`/cats/${id}`, { name }).then((r) => r.data),
    remove: (id: string) => axiosInstance.delete(`/cats/${id}`).then((r) => r.data),
    reindex: (ownerId?: string) =>
      axiosInstance.post<{ armed: number }>('/cats/reindex', { ownerId }).then((r) => r.data),
    assign: (photoId: string, catId: string) =>
      axiosInstance.post<Photo>(`/photos/${photoId}/cats`, { catId }).then((r) => r.data),
    unassign: (photoId: string, catId: string) =>
      axiosInstance.delete<Photo>(`/photos/${photoId}/cats/${catId}`).then((r) => r.data),
  },
};
```

## 주의 (꼭 읽기)
- **비동기 상태**: 업로드 직후엔 `thumbUrl=null`(아직 썸네일 생성 전). `procStatus/aiStatus/catStatus`가 모두 정착될 때까지 폴링 권장. 판단 헬퍼는 architecture 문서의 `isMediaSettling` 참고.
- **서명 URL 캐시**: `thumbUrl` 등은 만료가 있다(시간 경계로 라운딩 → 같은 윈도 내 동일 URL이라 브라우저 캐시 히트). 화면을 오래 열어두면 목록 refetch로 URL을 갱신.
- **웹 업로드**: 어드민에서 직접 업로드를 구현한다면, 이미지(jpeg/png/webp)는 그대로 presign→PUT→confirm. HEIC/HEVC 변환은 모바일 앱 전용 처리이므로 웹에선 표준 포맷만 받는 걸 권장.
</content>
