'use client';

import { useEffect, useState } from 'react';
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
import { useUpdateClient } from '@/hooks/queries';
import { SittingClient } from '@/lib/apis/api-client';

interface EditClientDialogProps {
  client: SittingClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditClientDialog({ client, open, onOpenChange }: EditClientDialogProps) {
  const updateClient = useUpdateClient();
  const [formData, setFormData] = useState({
    clientName: '',
    catName: '',
    address: '',
    entryNote: '',
    requirements: '',
  });

  useEffect(() => {
    if (client) {
      setFormData({
        clientName: client.clientName || '',
        catName: client.catName || '',
        address: client.address || '',
        entryNote: client.entryNote || '',
        requirements: client.requirements || '',
      });
    }
  }, [client]);

  const handleSubmit = async () => {
    if (!client) return;
    await updateClient.mutateAsync({
      clientId: client.id,
      dto: formData,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="clientName">Client Name</Label>
            <Input
              id="clientName"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="catName">Cat Name</Label>
            <Input
              id="catName"
              value={formData.catName}
              onChange={(e) => setFormData({ ...formData, catName: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
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
          <Button onClick={handleSubmit} disabled={updateClient.isPending}>
            {updateClient.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
