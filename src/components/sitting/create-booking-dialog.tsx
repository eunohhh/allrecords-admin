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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateBooking, useSittingClients } from '@/hooks/queries';

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBookingDialog({ open, onOpenChange }: CreateBookingDialogProps) {
  const createBooking = useCreateBooking();
  const { data: clients } = useSittingClients();
  const [formData, setFormData] = useState({
    clientId: '',
    reservationKst: '',
    expectedAmount: 0,
    amount: 0,
    contactMethod: '',
  });

  const handleSubmit = async () => {
    await createBooking.mutateAsync({
      clientId: formData.clientId,
      reservationKst: formData.reservationKst,
      expectedAmount: formData.expectedAmount,
      amount: formData.amount,
      contactMethod: formData.contactMethod || undefined,
    });
    setFormData({
      clientId: '',
      reservationKst: '',
      expectedAmount: 0,
      amount: 0,
      contactMethod: '',
    });
    onOpenChange(false);
  };

  const isValid = formData.clientId && formData.reservationKst;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Booking</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="clientId">Client *</Label>
            <Select
              value={formData.clientId}
              onValueChange={(value) => setFormData({ ...formData, clientId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.clientName} ({client.catName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reservationKst">Reservation Date (KST) *</Label>
            <Input
              id="reservationKst"
              type="datetime-local"
              value={formData.reservationKst}
              onChange={(e) => setFormData({ ...formData, reservationKst: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="expectedAmount">Expected Amount</Label>
            <Input
              id="expectedAmount"
              type="number"
              value={formData.expectedAmount}
              onChange={(e) =>
                setFormData({ ...formData, expectedAmount: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contactMethod">Contact Method</Label>
            <Input
              id="contactMethod"
              value={formData.contactMethod}
              onChange={(e) => setFormData({ ...formData, contactMethod: e.target.value })}
              placeholder="e.g., 카톡, 숨고"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createBooking.isPending || !isValid}>
            {createBooking.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
