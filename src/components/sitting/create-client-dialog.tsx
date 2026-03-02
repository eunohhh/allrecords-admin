'use client';

import { useState } from 'react';
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
import { useCreateClient } from '@/hooks/queries';

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateClientDialog({ open, onOpenChange }: CreateClientDialogProps) {
  const createClient = useCreateClient();
  const [formData, setFormData] = useState({
    clientName: '',
    catName: '',
    address: '',
    entryNote: '',
    requirements: '',
  });

  const handleSubmit = async () => {
    await createClient.mutateAsync({
      clientName: formData.clientName,
      catName: formData.catName,
      address: formData.address,
      entryNote: formData.entryNote || undefined,
      requirements: formData.requirements || undefined,
    });
    setFormData({
      clientName: '',
      catName: '',
      address: '',
      entryNote: '',
      requirements: '',
    });
    onOpenChange(false);
  };

  const isValid = formData.clientName && formData.catName && formData.address;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Client</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="clientName">Client Name *</Label>
            <Input
              id="clientName"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="catName">Cat Name *</Label>
            <Input
              id="catName"
              value={formData.catName}
              onChange={(e) => setFormData({ ...formData, catName: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="entryNote">Entry Note</Label>
            <Textarea
              id="entryNote"
              value={formData.entryNote}
              onChange={(e) => setFormData({ ...formData, entryNote: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="requirements">Requirements</Label>
            <Textarea
              id="requirements"
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createClient.isPending || !isValid}>
            {createClient.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
