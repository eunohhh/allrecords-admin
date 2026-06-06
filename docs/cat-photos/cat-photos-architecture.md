# 고양이 사진첩 — 아키텍처 / 동작 규칙

어드민에서 데이터를 다룰 때 알아야 하는 백엔드 내부 규칙. (API 시그니처는 [cat-photos-api.md](./cat-photos-api.md))

## 데이터 모델 (Prisma, `appId = "catphotos"`)

```
Photo
  id, appId, userId(=사진첩 주인), mediaType(PHOTO|VIDEO)
  s3Bucket, s3Key(원본)
  mimeType, sizeBytes, originalFileName, width, height, durationMs
  takenAt?(EXIF/메타), sortAt(정렬 기준 = takenAt ?? 업로드시각)
  procStatus, aiStatus, catStatus (각각 PENDING|PROCESSING|DONE|FAILED)
  aiTags[], aiCaption?, aiScene?, hasCat?, aiError?
  embedding Float[](검색용 768차원, pgvector 아님)
  catNames[](비정규화: 이 사진의 고양이 이름들)
  memo?, createdAt, updatedAt, createdById(=올린 사람), updatedById

GalleryShare   (ownerUserId, memberUserId) unique  — 사진첩 공유
Cat            (id, userId=주인, name) unique(userId,name) — 고양이 로스터
PhotoCat       (photoId, catId, source: 'user'|'ai') unique(photoId,catId) — 사진↔고양이 링크
```

### 소유권 / 공유 (중요)
- 사진첩은 **`Photo.userId`(주인)** 으로 식별. 별도 앨범 엔티티 없음.
- 접근 규칙: 어떤 사진/갤러리에 접근 가능 ⇔ `caller == 주인` **또는** `GalleryShare(owner=주인, member=caller)` 존재.
- 멤버가 공유받은 사진첩에 업로드하면 → `Photo.userId = 주인`, `createdById = 올린 사람`. (모두가 봄)
- API의 `ownerId` 파라미터 = "어느 사진첩". 생략 시 본인. 권한 없으면 403.

## 비동기 처리 파이프라인 (인프로세스 워커, ~15초 주기)
업로드 confirm 직후 row는 `procStatus=PENDING`. 워커가 단계별로 진행:

1. **proc** — 사진=썸네일/프리뷰(webp) 생성. 영상=ffmpeg로 poster 프레임 + 길이(`durationMs`) + 컨테이너 촬영일(있으면 `takenAt` 보정). 영상은 AI용 샘플 프레임도 저장. → `procStatus=DONE`
2. **ai** — 썸네일(영상=프레임들)로 Gemini 분류 → `aiTags/aiCaption/aiScene/hasCat`, 검색 임베딩 저장. `hasCat=false`면 `catStatus=DONE`(식별 불필요), `true`면 `catStatus=PENDING`. → `aiStatus=DONE`
3. **identify** — 로스터(등록 고양이)가 있으면 few-shot으로 고양이 이름 식별 → `PhotoCat(source=ai)` + `catNames` + (인식 시) 이름이 녹은 `aiCaption`/태그. → `catStatus=DONE`

> 상태는 컬럼 기반이라 서버 재시작에도 멱등하게 재개. 실패는 `FAILED` + `/retry`로 복구.

### 폴링 헬퍼 (어드민/앱 공통 권장)
```ts
export const isMediaSettling = (p: Photo): boolean =>
  p.procStatus === 'PENDING' || p.procStatus === 'PROCESSING' ||
  p.aiStatus === 'PENDING' || p.aiStatus === 'PROCESSING' ||
  (p.hasCat === true && (p.catStatus === 'PENDING' || p.catStatus === 'PROCESSING'));
```
`isMediaSettling`이 true인 항목이 있으면 5초 간격 등으로 `GET /photos/:id`를 폴링해 갱신하면 됨. (썸네일·태그·고양이 이름이 차례로 채워짐) TanStack Query라면 `refetchInterval`을 조건부로 주는 식으로 구현 가능.

## 스토리지 / CDN
- 전용 S3 버킷(비공개) + **CloudFront(OAC) + 서명 URL**. 원본은 절대 public 아님.
- 키 컨벤션: `catphotos/{ownerId}/{photoId}/` 아래 `original.{ext}`, `thumb.webp`, `preview.webp`, (영상) `poster`는 thumb/preview로, `aiframe_{i}.webp`.
- `thumbUrl/previewUrl/videoUrl`은 **서명 URL**. 만료는 TTL(기본 1h) **시간 경계로 라운딩**되어 같은 윈도 내 동일 문자열 → 브라우저/CDN 캐시 히트. 만료 후엔 목록을 다시 받으면 새 URL.

## 검색 / 정렬 / 순간
- **검색**(`/photos/search`): 키워드(태그·캡션·장면·고양이이름) + 질의 임베딩 코사인 유사도. pgvector 없이 서버에서 후보를 코사인 랭킹(개인 규모 가정).
- **정렬**: 전부 `sortAt DESC`. `sortAt = takenAt(EXIF/영상 메타) ?? 업로드시각`. 촬영일 보정은 `PATCH /photos/:id {takenAt}`.
- **순간**(`/photos/moments`): KST 일자별 섹션.

## 고양이 식별 (few-shot)
- 이미지 임베딩 인프라 없이, **분류 시 등록 고양이의 대표사진(사용자 지정분)을 Gemini에 동봉**해 "누구인지" 판별.
- 사용자가 `POST /photos/:id/cats`로 지정한 사진이 곧 참조 예시. 정확도는 참조 품질·고양이 수에 의존.
- 새 고양이 생성/`reindex` 시 갤러리의 기존 사진을 점진 재식별(`catStatus`를 PENDING으로 arm).

## 영상 메모
- 업로드: mp4/mov. iPhone HEVC(.mov)도 허용(앱은 그대로 업로드, 서버 ffmpeg가 디코드). 길이 60초·용량 200MB는 앱 클라이언트 검증.
- 재생: `videoUrl`(서명 원본)을 플레이어로. iOS HEVC 네이티브 재생 OK. (Android HEVC 호환은 향후 서버 트랜스코딩 검토 여지)
- 프로덕션 컨테이너에 `ffmpeg` 포함(Dockerfile `apk add ffmpeg`).

## 환경변수 (백엔드측 참고)
어드민에 직접 필요하진 않지만 운영 맥락:
`CAT_PHOTOS_S3_BUCKET`, `CAT_PHOTOS_AWS_ACCESS_KEY_ID/SECRET`, `CLOUDFRONT_DOMAIN`, `CLOUDFRONT_KEY_PAIR_ID`, `CLOUDFRONT_PRIVATE_KEY`(or `_PATH`), `CLOUDFRONT_SIGNED_URL_TTL_SECONDS`, `GEMINI_API_KEY`(+`GEMINI_MODEL`/`GEMINI_EMBED_MODEL`).
GEMINI 키 없으면 AI/식별/검색-임베딩은 비활성(사진·영상 기본 기능은 정상).
</content>
