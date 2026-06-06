'use client';

import { useEffect, useId, useState } from 'react';
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
import { useRenameCat } from '@/hooks/cat-photos-queries';
import type { CatSummary } from '@/lib/apis/api-client';
import { getErrorMessage } from '@/lib/errors';

interface EditCatDialogProps {
  cat: CatSummary | null;
  ownerId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCatDialog({ cat, ownerId, open, onOpenChange }: EditCatDialogProps) {
  const renameCat = useRenameCat(ownerId);
  const nameId = useId();
  const [name, setName] = useState('');

  useEffect(() => {
    if (cat) setName(cat.name);
  }, [cat]);

  const handleSubmit = async () => {
    if (!cat || !name.trim()) return;
    try {
      await renameCat.mutateAsync({ id: cat.id, name: name.trim() });
      toast.success('이름을 변경했습니다');
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>고양이 이름 변경</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor={nameId}>이름</Label>
            <Input id={nameId} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || renameCat.isPending}>
            {renameCat.isPending ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
