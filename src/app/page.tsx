'use client';

import {
  addMonths,
  endOfMonth,
  format,
  setMonth,
  setYear,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  bookingColumns,
  careColumns,
  clientColumns,
  CreateBookingDialog,
  CreateCareDialog,
  CreateClientDialog,
  EditBookingDialog,
  EditCareDialog,
  EditClientDialog,
} from '@/components/sitting';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useDeleteBooking,
  useDeleteCare,
  useDeleteClient,
  useSittingBookings,
  useSittingCaresForCalendar,
  useSittingClients,
} from '@/hooks/queries';
import { SittingBooking, SittingCare, SittingClient } from '@/lib/apis/api-client';
import { authClient } from '@/lib/auth-client';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Edit Dialog states
  const [selectedClient, setSelectedClient] = useState<SittingClient | null>(null);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<SittingBooking | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedCare, setSelectedCare] = useState<SittingCare | null>(null);
  const [careDialogOpen, setCareDialogOpen] = useState(false);

  // Create Dialog states
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [createBookingOpen, setCreateBookingOpen] = useState(false);
  const [createCareOpen, setCreateCareOpen] = useState(false);

  // Selection states
  const [selectedClients, setSelectedClients] = useState<SittingClient[]>([]);
  const [selectedBookings, setSelectedBookings] = useState<SittingBooking[]>([]);
  const [selectedCares, setSelectedCares] = useState<SittingCare[]>([]);

  // Mutations
  const deleteClient = useDeleteClient();
  const deleteBooking = useDeleteBooking();
  const deleteCare = useDeleteCare();

  // Queries
  const { data: clients, isLoading: clientsLoading } = useSittingClients();
  const { data: bookings, isLoading: bookingsLoading } = useSittingBookings();

  // Derived state for cares query
  const from = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const to = format(endOfMonth(currentDate), 'yyyy-MM-dd');
  const { data: cares, isLoading: caresLoading } = useSittingCaresForCalendar(from, to);

  const handlePrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));

  const handleYearChange = (year: string) => {
    setCurrentDate((prev) => setYear(prev, parseInt(year, 10)));
  };

  const handleMonthChange = (month: string) => {
    setCurrentDate((prev) => setMonth(prev, parseInt(month, 10) - 1));
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Generate year options (current year +/- 5)
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    if (!isPending) {
      if (!session) {
        router.push('/login');
      } else {
        if (session.user.role !== 'admin') {
          // Access denied handling if needed
        }
        setIsAuthorized(true);
      }
    }
  }, [session, isPending, router]);

  const handleLogout = async () => {
    await authClient.signOut();
    localStorage.removeItem('app_access_token');
    router.push('/login');
  };

  // Row click handlers
  const handleClientClick = (client: SittingClient) => {
    setSelectedClient(client);
    setClientDialogOpen(true);
  };

  const handleBookingClick = (booking: SittingBooking) => {
    setSelectedBooking(booking);
    setBookingDialogOpen(true);
  };

  const handleCareClick = (care: SittingCare) => {
    setSelectedCare(care);
    setCareDialogOpen(true);
  };

  // Selection handlers
  const handleClientSelection = useCallback((rows: SittingClient[]) => {
    setSelectedClients(rows);
  }, []);

  const handleBookingSelection = useCallback((rows: SittingBooking[]) => {
    setSelectedBookings(rows);
  }, []);

  const handleCareSelection = useCallback((rows: SittingCare[]) => {
    setSelectedCares(rows);
  }, []);

  // Delete handlers
  const handleDeleteClient = async () => {
    if (selectedClients.length === 0) return;
    if (!confirm('Are you sure you want to delete this client?')) return;
    await deleteClient.mutateAsync(selectedClients[0].id);
    setSelectedClients([]);
  };

  const handleDeleteBooking = async () => {
    if (selectedBookings.length === 0) return;
    if (!confirm('Are you sure you want to delete this booking? All related cares will also be deleted.')) return;
    await deleteBooking.mutateAsync(selectedBookings[0].id);
    setSelectedBookings([]);
  };

  const handleDeleteCare = async () => {
    if (selectedCares.length === 0) return;
    if (!confirm('Are you sure you want to delete this care?')) return;
    await deleteCare.mutateAsync(selectedCares[0].id);
    setSelectedCares([]);
  };

  if (isPending || !isAuthorized) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Family Infra Dashboard</h1>
        <div className="flex items-center gap-4">
          <span>
            {session?.user?.name} ({session?.user?.role})
          </span>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="cares">Cares</TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <div className="rounded-md border p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Clients</h2>
                <p className="text-sm text-muted-foreground">Click on a row to edit</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setCreateClientOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteClient}
                  disabled={selectedClients.length === 0 || deleteClient.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
            {clientsLoading ? (
              <div>Loading...</div>
            ) : (
              <DataTable
                columns={clientColumns}
                data={clients || []}
                onRowClick={handleClientClick}
                onSelectionChange={handleClientSelection}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="bookings">
          <div className="rounded-md border p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Bookings</h2>
                <p className="text-sm text-muted-foreground">Click on a row to edit</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setCreateBookingOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteBooking}
                  disabled={selectedBookings.length === 0 || deleteBooking.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
            {bookingsLoading ? (
              <div>Loading...</div>
            ) : (
              <DataTable
                columns={bookingColumns}
                data={bookings || []}
                onRowClick={handleBookingClick}
                onSelectionChange={handleBookingSelection}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="cares">
          <div className="rounded-md border p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Cares</h2>
                <p className="text-sm text-muted-foreground">Click on a row to edit</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}년
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
                    <SelectTrigger className="w-[80px]">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {month}월
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button onClick={() => setCreateCareOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteCare}
                  disabled={selectedCares.length === 0 || deleteCare.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
            {caresLoading ? (
              <div>Loading...</div>
            ) : (
              <DataTable
                columns={careColumns}
                data={cares || []}
                onRowClick={handleCareClick}
                onSelectionChange={handleCareSelection}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialogs */}
      <EditClientDialog
        client={selectedClient}
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
      />
      <EditBookingDialog
        booking={selectedBooking}
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
      />
      <EditCareDialog care={selectedCare} open={careDialogOpen} onOpenChange={setCareDialogOpen} />

      {/* Create Dialogs */}
      <CreateClientDialog open={createClientOpen} onOpenChange={setCreateClientOpen} />
      <CreateBookingDialog open={createBookingOpen} onOpenChange={setCreateBookingOpen} />
      <CreateCareDialog open={createCareOpen} onOpenChange={setCreateCareOpen} />
    </div>
  );
}
