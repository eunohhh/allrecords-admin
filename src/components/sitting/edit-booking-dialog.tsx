'use client';

import { format } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateBooking, useUpdateBookingStatus, useUpdatePaymentStatus } from '@/hooks/queries';
import { SittingBooking } from '@/lib/apis/api-client';

interface EditBookingDialogProps {
  booking: SittingBooking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBookingDialog({ booking, open, onOpenChange }: EditBookingDialogProps) {
  const updateBooking = useUpdateBooking();
  const updateBookingStatus = useUpdateBookingStatus();
  const updatePaymentStatus = useUpdatePaymentStatus();

  const [formData, setFormData] = useState({
    bookingStatus: '',
    paymentStatus: '',
    contactMethod: '',
    expectedAmount: 0,
    amount: 0,
    reservationKst: '',
  });

  useEffect(() => {
    if (booking) {
      setFormData({
        bookingStatus: booking.bookingStatus || '',
        paymentStatus: booking.paymentStatus || '',
        contactMethod: booking.contactMethod || '',
        expectedAmount: booking.expectedAmount || 0,
        amount: booking.amount || 0,
        reservationKst: booking.reservationDate
          ? format(new Date(booking.reservationDate), "yyyy-MM-dd'T'HH:mm")
          : '',
      });
    }
  }, [booking]);

  const handleSubmit = async () => {
    if (!booking) return;

    // Update booking status if changed
    if (formData.bookingStatus !== booking.bookingStatus) {
      await updateBookingStatus.mutateAsync({
        bookingId: booking.id,
        status: formData.bookingStatus,
      });
    }

    // Update payment status if changed
    if (formData.paymentStatus !== booking.paymentStatus) {
      await updatePaymentStatus.mutateAsync({
        bookingId: booking.id,
        status: formData.paymentStatus,
      });
    }

    // Update other fields
    await updateBooking.mutateAsync({
      bookingId: booking.id,
      dto: {
        contactMethod: formData.contactMethod,
        expectedAmount: formData.expectedAmount,
        amount: formData.amount,
        reservationKst: formData.reservationKst,
      },
    });

    onOpenChange(false);
  };

  const isPending =
    updateBooking.isPending || updateBookingStatus.isPending || updatePaymentStatus.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="bookingStatus">Booking Status</Label>
            <Select
              value={formData.bookingStatus}
              onValueChange={(value) => setFormData({ ...formData, bookingStatus: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">PENDING</SelectItem>
                <SelectItem value="CONFIRMED">CONFIRMED</SelectItem>
                <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paymentStatus">Payment Status</Label>
            <Select
              value={formData.paymentStatus}
              onValueChange={(value) => setFormData({ ...formData, paymentStatus: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNPAID">UNPAID</SelectItem>
                <SelectItem value="PAID">PAID</SelectItem>
                <SelectItem value="REFUNDED">REFUNDED</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contactMethod">Contact Method</Label>
            <Input
              id="contactMethod"
              value={formData.contactMethod}
              onChange={(e) => setFormData({ ...formData, contactMethod: e.target.value })}
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
            <Label htmlFor="reservationKst">Reservation Date (KST)</Label>
            <Input
              id="reservationKst"
              type="datetime-local"
              value={formData.reservationKst}
              onChange={(e) => setFormData({ ...formData, reservationKst: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
