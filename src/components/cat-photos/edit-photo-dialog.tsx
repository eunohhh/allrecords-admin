'use client';

import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useAddPhotoCat,
  useDeletePhoto,
  usePhoto,
  useRemovePhotoCat,
  useRetryPhoto,
  useUpdatePhoto,
} from '@/hooks/cat-photos-queries';
import type { CatSummary, MediaStatus, Photo } from '@/lib/apis/api-client';
import { toLocalInput } from '@/lib/cat-photos/taken-at';
import { getErrorMessage } from '@/lib/errors';
import { StatusBadge } from './columns';

interface EditPhotoDialogProps {
  photo: Photo | null;
  ownerId?: string;
  cats: CatSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isFailed = (s: MediaStatus) => s === 'FAILED';

export function EditPhotoDialog({
  photo,
  ownerId,
  cats,
  open,
  onOpenChange,
}: EditPhotoDialogProps) {
  const { data: detail } = usePhoto(photo?.id, open);
  const current = detail ?? photo;

  const updatePhoto = useUpdatePhoto(ownerId);
  const retryPhoto = useRetryPhoto(ownerId);
  const deletePhoto = useDeletePhoto(ownerId);
  const addCat = useAddPhotoCat(ownerId);
  const removeCat = useRemovePhotoCat(ownerId);

  const takenAtId = useId();
  const memoId = useId();
  const [memo, setMemo] = useState('');
  const [takenAt, setTakenAt] = useState('');

  useEffect(() => {
    if (photo) {
      setMemo(photo.memo ?? '');
      setTakenAt(toLocalInput(photo.takenAt));
    }
  }, [photo]);

  if (!current) return null;

  const failed =
    isFailed(current.procStatus) ||
    isFailed(current.aiStatus) ||
    (current.hasCat === true && isFailed(current.catStatus));

  const assignedNames = new Set(current.catNames);

  const handleSave = async () => {
    try {
      await updatePhoto.mutateAsync({
        id: current.id,
        dto: {
          memo: memo || undefined,
          takenAt: takenAt ? new Date(takenAt).toISOString() : undefined,
        },
      });
      toast.success('수정되었습니다');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleRetry = async () => {
    try {
      await retryPhoto.mutateAsync(current.id);
      toast.success('재처리를 요청했습니다');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleToggleCat = async (cat: CatSummary, assigned: boolean) => {
    try {
      if (assigned) {
        await removeCat.mutateAsync({ photoId: current.id, catId: cat.id });
        toast.success(`${cat.name} 지정 해제`);
      } else {
        await addCat.mutateAsync({ photoId: current.id, catId: cat.id });
        toast.success(`${cat.name} 지정`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!confirm('이 사진을 삭제할까요?')) return;
    try {
      await deletePhoto.mutateAsync(current.id);
      toast.success('삭제되었습니다');
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const previewUrl = detail?.previewUrl ?? current.thumbUrl;
  const catBusy = addCat.isPending || removeCat.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>사진 상세</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="flex justify-center rounded-md border bg-muted/30 p-2">
            {previewUrl ? (
              current.mediaType === 'VIDEO' && detail?.videoUrl ? (
                <video
                  src={detail.videoUrl}
                  controls
                  poster={previewUrl}
                  className="max-h-72 rounded"
                >
                  <track kind="captions" />
                </video>
              ) : (
                // biome-ignore lint/performance/noImgElement: no next/image config; CDN-signed URLs rendered as plain <img>
                <img
                  src={previewUrl}
                  alt={current.aiCaption || current.memo || '사진 미리보기'}
                  className="max-h-72 rounded object-contain"
                />
              )
            ) : (
              <div className="flex h-40 w-full items-center justify-center text-sm text-muted-foreground">
                미리보기 처리 중...
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            <StatusBadge label="썸네일" status={current.procStatus} />
            <StatusBadge label="AI" status={current.aiStatus} />
            {current.hasCat === true && <StatusBadge label="고양이" status={current.catStatus} />}
          </div>

          {current.aiCaption && (
            <p className="text-sm text-muted-foreground">{current.aiCaption}</p>
          )}
          {current.aiTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {current.aiTags.map((tag, i) => (
                <Badge key={`${tag}-${i}`} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {failed && (
            <div>
              <Button variant="secondary" onClick={handleRetry} disabled={retryPhoto.isPending}>
                {retryPhoto.isPending ? '재처리 중...' : '재처리 (Retry)'}
              </Button>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor={takenAtId}>촬영일</Label>
            <Input
              id={takenAtId}
              type="datetime-local"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={memoId}>메모</Label>
            <Textarea id={memoId} value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>고양이 지정</Label>
            {cats.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                등록된 고양이가 없습니다. Cats 탭에서 먼저 추가하세요.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cats.map((cat) => {
                  const assigned = assignedNames.has(cat.name);
                  return (
                    <Button
                      key={cat.id}
                      type="button"
                      size="sm"
                      variant={assigned ? 'default' : 'outline'}
                      disabled={catBusy}
                      onClick={() => handleToggleCat(cat, assigned)}
                    >
                      {cat.name}
                      {assigned ? ' ✓' : ''}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button variant="destructive" onClick={handleDelete} disabled={deletePhoto.isPending}>
            삭제
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
            <Button onClick={handleSave} disabled={updatePhoto.isPending}>
              {updatePhoto.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
