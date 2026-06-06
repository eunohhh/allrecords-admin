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
import { useCreateCat } from '@/hooks/cat-photos-queries';
import { getErrorMessage } from '@/lib/errors';

interface CreateCatDialogProps {
  ownerId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCatDialog({ ownerId, open, onOpenChange }: CreateCatDialogProps) {
  const createCat = useCreateCat(ownerId);
  const nameId = useId();
  const [name, setName] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      await createCat.mutateAsync({ name: name.trim(), ownerId });
      toast.success('고양이를 추가했습니다');
      setName('');
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>고양이 추가</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor={nameId}>이름 *</Label>
            <Input id={nameId} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || createCat.isPending}>
            {createCat.isPending ? '추가 중...' : '추가'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
