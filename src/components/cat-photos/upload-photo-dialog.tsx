'use client';

import { useId, useRef, useState } from 'react';
import { toast } from 'sonner';
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
import { type UploadPhase, useUploadPhoto } from '@/hooks/cat-photos-queries';
import { ACCEPT_ATTR, looksLikeHeic, validateUploadFile } from '@/lib/cat-photos/media';
import { inferTakenAt, toLocalInput } from '@/lib/cat-photos/taken-at';
import { getErrorMessage } from '@/lib/errors';
import { FileDropzone } from './file-dropzone';

interface UploadPhotoDialogProps {
  ownerId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PHASE_LABEL: Record<UploadPhase, string> = {
  idle: '',
  converting: 'HEIC → JPEG 변환 중...',
  reading: '메타데이터 읽는 중...',
  presigning: '업로드 주소 발급 중...',
  uploading: 'S3 업로드 중...',
  confirming: '확정 중...',
  processing: '서버 처리 대기 중...',
};

export function UploadPhotoDialog({ ownerId, open, onOpenChange }: UploadPhotoDialogProps) {
  const uploadPhoto = useUploadPhoto(ownerId);
  const takenAtId = useId();
  const memoId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [memo, setMemo] = useState('');
  const [takenAt, setTakenAt] = useState('');
  const [autoFilledTakenAt, setAutoFilledTakenAt] = useState(false);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  // Guards against out-of-order async inference: only the latest selection
  // applies its inferTakenAt result.
  const inferReqRef = useRef(0);

  const reset = () => {
    setFile(null);
    setMemo('');
    setTakenAt('');
    setAutoFilledTakenAt(false);
    setPhase('idle');
  };

  const processFile = async (picked: File) => {
    // Claim the latest token before validation so a rejected file still wins —
    // a stale earlier inference can't fill a date for a file that was rejected.
    const reqId = ++inferReqRef.current;
    try {
      // HEIC is validated after client-side conversion (during upload), so skip
      // the early whitelist check here — it would otherwise reject the picker.
      if (!looksLikeHeic(picked)) {
        await validateUploadFile(picked);
      }
      setFile(picked);
    } catch (err) {
      toast.error(getErrorMessage(err));
      return;
    }
    // Only infer when the user hasn't typed their own value; a previously
    // auto-filled value may be overwritten by the new file.
    if (takenAt === '' || autoFilledTakenAt) {
      const inferred = await inferTakenAt(picked);
      // Discard if a newer selection has since started — avoids out-of-order clobber.
      if (inferred && reqId === inferReqRef.current) {
        setTakenAt(toLocalInput(inferred));
        setAutoFilledTakenAt(true);
      }
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    try {
      await uploadPhoto.mutateAsync({
        file,
        memo: memo || undefined,
        // datetime-local has no timezone; convert to ISO for the API.
        takenAt: takenAt ? new Date(takenAt).toISOString() : undefined,
        onPhase: setPhase,
      });
      toast.success('업로드 완료. 처리 중이며 잠시 후 썸네일이 표시됩니다.');
      reset();
      onOpenChange(false);
    } catch (err) {
      setPhase('idle');
      toast.error(getErrorMessage(err));
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && uploadPhoto.isPending) return;
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>사진/영상 업로드</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            {/* No htmlFor: the dropzone is a <button> with its own aria-label,
                not a labelable form control. Label is visual only. */}
            <Label>파일 *</Label>
            <FileDropzone
              file={file}
              accept={ACCEPT_ATTR}
              disabled={uploadPhoto.isPending}
              onFile={processFile}
            />
            <p className="text-xs text-muted-foreground">
              이미지 jpeg/png/webp/heic(≤25MB), 영상 mp4/mov(≤200MB, ≤60초). HEIC는 업로드 시 JPEG로
              자동 변환됩니다.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={takenAtId}>촬영일 (선택)</Label>
            <Input
              id={takenAtId}
              type="datetime-local"
              value={takenAt}
              onChange={(e) => {
                setTakenAt(e.target.value);
                setAutoFilledTakenAt(false);
              }}
              disabled={uploadPhoto.isPending}
            />
            <p className="text-xs text-muted-foreground">
              {autoFilledTakenAt
                ? '파일에서 촬영일을 자동으로 채웠어요. 필요하면 수정하세요.'
                : '비우면 파일 수정일을 사용합니다.'}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={memoId}>메모 (선택)</Label>
            <Textarea
              id={memoId}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              disabled={uploadPhoto.isPending}
            />
          </div>
          {phase !== 'idle' && (
            <p className="text-sm text-muted-foreground">{PHASE_LABEL[phase]}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={uploadPhoto.isPending}
          >
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!file || uploadPhoto.isPending}>
            {uploadPhoto.isPending ? '업로드 중...' : '업로드'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
