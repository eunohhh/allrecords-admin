'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { SittingBooking, SittingCare, SittingClient } from '@/lib/apis/api-client';

function truncate(text: string | null | undefined, maxLength = 30): string {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

export const clientColumns: ColumnDef<SittingClient>[] = [
  {
    id: 'select',
    header: '',
    cell: ({ row, table }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => {
          table.resetRowSelection();
          row.toggleSelected(!!value);
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'clientName', header: 'Name' },
  { accessorKey: 'catName', header: 'Cat' },
  { accessorKey: 'address', header: 'Address' },
  {
    accessorKey: 'entryNote',
    header: 'Entry Note',
    cell: ({ row }) => truncate(row.getValue('entryNote')),
  },
  {
    accessorKey: 'requirements',
    header: 'Requirements',
    cell: ({ row }) => truncate(row.getValue('requirements')),
  },
];

export const bookingColumns: ColumnDef<SittingBooking>[] = [
  {
    id: 'select',
    header: '',
    cell: ({ row, table }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => {
          table.resetRowSelection();
          row.toggleSelected(!!value);
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'bookingStatus', header: 'Status' },
  { accessorKey: 'paymentStatus', header: 'Payment' },
  { accessorKey: 'client.clientName', header: 'Client' },
  { accessorKey: 'contactMethod', header: 'Contact Method' },
  { accessorKey: 'expectedAmount', header: 'Expected Amount' },
  { accessorKey: 'amount', header: 'Amount' },
  {
    accessorKey: 'reservationDate',
    header: 'Reservation Date',
    cell: ({ row }) => format(new Date(row.getValue('reservationDate')), 'yyyy-MM-dd HH:mm'),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => format(new Date(row.getValue('createdAt')), 'yyyy-MM-dd HH:mm'),
  },
];

export const careColumns: ColumnDef<SittingCare>[] = [
  {
    id: 'select',
    header: '',
    cell: ({ row, table }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => {
          table.resetRowSelection();
          row.toggleSelected(!!value);
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  { accessorKey: 'id', header: 'ID' },
  {
    accessorKey: 'careTime',
    header: 'Date',
    cell: ({ row }) => format(new Date(row.getValue('careTime')), 'yyyy-MM-dd HH:mm'),
  },
  {
    accessorKey: 'note',
    header: 'Note',
    cell: ({ row }) => truncate(row.getValue('note')),
  },
  { accessorKey: 'booking.client.clientName', header: 'Client' },
  { accessorKey: 'booking.catName', header: 'Cat' },
  {
    accessorKey: 'completedAt',
    header: 'Completed At',
    cell: ({ row }) => {
      const value = row.getValue('completedAt');
      return value ? format(new Date(value as string), 'yyyy-MM-dd HH:mm') : '-';
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => format(new Date(row.getValue('createdAt')), 'yyyy-MM-dd HH:mm'),
  },
  {
    accessorKey: 'updatedAt',
    header: 'Updated At',
    cell: ({ row }) => format(new Date(row.getValue('updatedAt')), 'yyyy-MM-dd HH:mm'),
  },
];
