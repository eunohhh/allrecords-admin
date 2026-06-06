'use client';

import { useId, useState } from 'react';
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
import { useAddShare } from '@/hooks/cat-photos-queries';
import { getErrorMessage } from '@/lib/errors';

interface AddShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddShareDialog({ open, onOpenChange }: AddShareDialogProps) {
  const addShare = useAddShare();
  const emailId = useId();
  const [email, setEmail] = useState('');

  const isValid = email.trim().length > 0 && email.includes('@');

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      await addShare.mutateAsync(email.trim());
      toast.success('사진첩을 공유했습니다');
      setEmail('');
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>사진첩 공유 추가</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor={emailId}>이메일 *</Label>
            <Input
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
            />
            <p className="text-xs text-muted-foreground">
              앱/어드민에 1회 이상 로그인한 사용자만 공유할 수 있습니다.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || addShare.isPending}>
            {addShare.isPending ? '공유 중...' : '공유'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
