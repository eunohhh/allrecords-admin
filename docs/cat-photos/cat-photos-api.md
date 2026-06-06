# 고양이 사진첩 — API 레퍼런스

베이스 URL: `NEXT_PUBLIC_API_BASE_URL` · 인증: `Authorization: Bearer <app_access_token>` (모든 엔드포인트 공통).
경로에 **글로벌 prefix 없음**(아래 경로 그대로). `ownerId` 생략 = 호출자 본인 사진첩.

---

## 공통 TypeScript 인터페이스 (복붙용)

```ts
export type MediaStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface Photo {
  id: string;
  ownerId: string;            // 사진첩 주인(갤러리 식별자)
  mediaType: 'PHOTO' | 'VIDEO';
  width: number | null;
  height: number | null;
  takenAt: string | null;     // ISO. 사진=EXIF, 영상=컨테이너 메타. 없으면 null
  sortAt: string;             // ISO. 정렬 기준 = takenAt ?? 업로드시각
  thumbUrl: string | null;    // CloudFront 서명 URL(그리드). procStatus=DONE 전엔 null
  previewUrl: string | null;  // 상세용(단건 조회에서만 채워짐)
  videoUrl: string | null;    // 영상 원본 서명 URL(VIDEO만)
  procStatus: MediaStatus;    // 썸네일/프리뷰(영상=poster) 생성 상태
  aiStatus: MediaStatus;      // AI 분류(태그/캡션) 상태
  catStatus: MediaStatus;     // 고양이 이름 식별 상태
  aiTags: string[];           // 한국어 태그(고양이 이름 포함될 수 있음)
  aiCaption: string | null;   // 한 문장 캡션
  hasCat: boolean | null;     // 고양이 등장 여부(AI 판정)
  catNames: string[];         // 이 사진/영상에 있는 등록된 고양이 이름들
  durationMs: number | null;  // 영상 길이
  memo: string | null;
  createdAt: string;          // ISO (업로드/생성 시각)
}

export interface PhotoPage {
  items: Photo[];
  nextCursor: string | null;  // null이면 다음 페이지 없음
}

export interface MomentSection {
  date: string;   // KST 'yyyy-MM-dd'
  label: string;  // '2026년 6월 5일'
  items: Photo[]; // 해당 날짜 사진/영상 (thumbUrl 포함)
}

export interface GallerySummary {
  ownerId: string;
  ownerName: string;
  isOwner: boolean;  // true=내 사진첩, false=공유받은 사진첩
}

export interface ShareMember {
  memberUserId: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface CatSummary {
  id: string;
  name: string;
  photoCount: number;
  coverThumbUrl: string | null; // 대표 썸네일 서명 URL
}
```

---

## 사진/영상 (`/photos`)

### 업로드 (3단계)
1) **presign 요청**
`POST /photos/upload-url`
```jsonc
// body
{ "mimeType": "image/jpeg", "sizeBytes": 1234567, "ownerId": "<optional>" }
// → 200
{ "photoId": "uuid", "key": "catphotos/<owner>/<id>/original.jpg", "uploadUrl": "https://s3...", "expiresAt": "ISO" }
```
- 허용 mime: `image/jpeg|image/png|image/webp`(≤25MB), `video/mp4|video/quicktime`(≤200MB).

2) **S3 직접 PUT** — `uploadUrl`에 `PUT`, 헤더 `Content-Type: <mimeType>`, 바디=파일. **Authorization 헤더 붙이지 말 것**(서명 URL이라 충돌). 별도 fetch 사용.

3) **확정**
`POST /photos/:photoId/confirm`
```jsonc
// body (key는 1단계 응답값 그대로)
{ "key": "...", "width": 4032, "height": 3024, "takenAt": "ISO?", "originalFileName": "IMG.jpg?", "memo": "?" }
// → 200: Photo (procStatus=PENDING; 썸네일/AI는 이후 백그라운드)
```

### 목록 (커서 페이지네이션)
`GET /photos?ownerId=&cursor=&limit=` → `PhotoPage`
- 정렬: `sortAt DESC`(촬영일 우선). `limit` 기본 50, 최대 100.
- 다음 페이지: 응답 `nextCursor`를 다음 요청 `cursor`로.

### 단건 조회 (previewUrl 포함)
`GET /photos/:photoId` → `Photo` (여기서만 `previewUrl` 채워짐)

### 검색 (키워드 + 의미)
`GET /photos/search?q=&ownerId=&limit=` → `Photo[]`
- 태그/캡션/장면/고양이이름 키워드 매칭 + Gemini 임베딩 코사인 유사도 결합. `q` 필수.

### 순간/추억 (시간 기준)
`GET /photos/moments?ownerId=` → `{ sections: MomentSection[] }`
- KST 일자별 섹션(최근순).

### 메타 수정
`PATCH /photos/:photoId`
```jsonc
{ "memo": "?", "takenAt": "ISO?" }  // → Photo. takenAt 바꾸면 정렬(sortAt)도 갱신
```

### 재처리 (실패 복구)
`POST /photos/:photoId/retry` → `Photo`
- `procStatus=FAILED`면 썸네일부터, `aiStatus=FAILED`면 AI만 다시 PENDING으로 되돌려 워커가 재처리.

### 삭제
`DELETE /photos/:photoId` → `{ "ok": true }` (S3 원본+변형 정리 후 DB 삭제)

---

## 사진첩 공유 (`/galleries`)

| 메서드 | 경로 | body | 응답 | 비고 |
|--------|------|------|------|------|
| GET | `/galleries` | — | `GallerySummary[]` | 접근 가능한 사진첩(본인 + 공유받은 것) |
| GET | `/galleries/shares` | — | `ShareMember[]` | 내 사진첩의 멤버 목록(소유자) |
| POST | `/galleries/shares` | `{ email }` | `ShareMember` | 이메일로 내 사진첩 공유. 멤버는 전체 CRUD 권한 |
| DELETE | `/galleries/shares/:memberUserId` | — | `{ ok: true }` | 멤버 공유 해제(소유자) |

- 공유 대상은 앱/어드민에 **1회 이상 로그인**해 User에 존재해야 함(없으면 404).
- 본인 공유 400, 중복 공유는 멱등.

---

## 고양이 (`/cats`, `/photos/:id/cats`)

| 메서드 | 경로 | body | 응답 | 비고 |
|--------|------|------|------|------|
| GET | `/cats?ownerId=` | — | `CatSummary[]` | 로스터(대표 썸네일·장수) |
| POST | `/cats` | `{ name, ownerId? }` | `CatSummary` | 생성 → 갤러리 재식별 자동 arm |
| PATCH | `/cats/:id` | `{ name }` | `{ ok: true }` | 이름 변경(사진 태그도 갱신) |
| DELETE | `/cats/:id` | — | `{ ok: true }` | 삭제(링크/태그 정리) |
| POST | `/cats/reindex` | `{ ownerId? }` | `{ armed: number }` | 기존 사진 재식별(소급). armed=대상 장수 |
| POST | `/photos/:photoId/cats` | `{ catId }` | `Photo` | 사용자 지정(=few-shot 참조가 됨) |
| DELETE | `/photos/:photoId/cats/:catId` | — | `Photo` | 링크 해제(AI 오인식 수정) |

- 사용자가 지정한 사진(`source=user`)이 **few-shot 참조 예시**가 되어, 이후 같은 고양이를 자동 인식해 `catNames`/태그/캡션에 이름을 넣음.

---

## 에러 형식
NestJS 표준: `{ statusCode, message, error }`. axios에선 `error.response.data.message`로 메시지 추출(이 레포 기존 패턴과 동일).
주요: 400(잘못된 입력/본인 공유), 403(접근 권한 없음 — 해당 갤러리 비소유·비멤버), 404(없음/이메일 사용자 없음).
</content>
