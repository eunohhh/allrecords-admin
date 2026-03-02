'use client';

import { format } from 'date-fns';
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
import { Textarea } from '@/components/ui/textarea';
import { useCreateCare, useSittingBookings } from '@/hooks/queries';

interface CreateCareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCareDialog({ open, onOpenChange }: CreateCareDialogProps) {
  const createCare = useCreateCare();
  const { data: bookings } = useSittingBookings();
  const [formData, setFormData] = useState({
    bookingId: '',
    careTimeKst: '',
    note: '',
  });

  const handleSubmit = async () => {
    await createCare.mutateAsync({
      bookingId: formData.bookingId,
      careTimeKst: formData.careTimeKst,
      note: formData.note || undefined,
    });
    setFormData({
      bookingId: '',
      careTimeKst: '',
      note: '',
    });
    onOpenChange(false);
  };

  const isValid = formData.bookingId && formData.careTimeKst;

  // Filter to exclude CANCELLED bookings
  const activeBookings = bookings?.filter((b) => b.bookingStatus !== 'CANCELLED') || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Care</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="bookingId">Booking *</Label>
            <Select
              value={formData.bookingId}
              onValueChange={(value) => setFormData({ ...formData, bookingId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select booking" />
              </SelectTrigger>
              <SelectContent>
                {activeBookings.map((booking) => (
                  <SelectItem key={booking.id} value={booking.id}>
                    {booking.client?.clientName} - {booking.catName} ({format(new Date(booking.reservationDate), 'yyyy-MM-dd')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="careTimeKst">Care Time (KST) *</Label>
            <Input
              id="careTimeKst"
              type="datetime-local"
              value={formData.careTimeKst}
              onChange={(e) => setFormData({ ...formData, careTimeKst: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createCare.isPending || !isValid}>
            {createCare.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
