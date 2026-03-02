import { axiosInstance } from "../api/axios";

// Types
export interface SittingClient {
  id: string;
  clientName: string;
  catName: string;
  address: string;
  entryNote?: string;
  requirements?: string;
  catPic?: string;
}

export interface SittingBooking {
  id: string;
  bookingStatus: string;
  paymentStatus: string;
  contactMethod?: string;
  expectedAmount?: number;
  amount?: number;
  reservationDate: string;
  catName?: string;
  addressSnapshot?: string;
  entryNoteSnapshot?: string;
  client?: { clientName: string };
}

export interface SittingCare {
  id: string;
  careTime: string;
  note?: string;
  completedAt?: string;
  booking?: {
    client?: { clientName: string };
    catName?: string;
  };
}

export interface UpdateClientDto {
  clientName?: string;
  catName?: string;
  address?: string;
  entryNote?: string;
  requirements?: string;
  catPic?: string;
}

export interface UpdateBookingDto {
  reservationKst?: string;
  expectedAmount?: number;
  amount?: number;
  contactMethod?: string;
  catName?: string;
  addressSnapshot?: string;
  entryNoteSnapshot?: string;
}

export interface UpdateCareDto {
  careTimeKst?: string;
  note?: string;
  completedAt?: string | null;
}

export interface CreateClientDto {
  clientName: string;
  catName: string;
  address: string;
  entryNote?: string;
  requirements?: string;
}

export interface CreateBookingDto {
  clientId: string;
  reservationKst: string;
  expectedAmount: number;
  amount: number;
  contactMethod?: string;
}

export interface CreateCareDto {
  bookingId: string;
  careTimeKst: string;
  note?: string;
}

export const api = {
  auth: {
    // Exchange Better Auth Session for App JWT
    getAdminToken: async () => {
      const response = await axiosInstance.post<{
        accessToken: string;
        user: any;
      }>("/auth/app/admin/token");
      return response.data;
    },
  },
  sitting: {
    getClients: async () => {
      const response = await axiosInstance.get<SittingClient[]>("/sitting/clients");
      return response.data;
    },
    getBookings: async (params?: { clientId?: string; status?: string }) => {
      const response = await axiosInstance.get<SittingBooking[]>("/sitting/bookings", {
        params,
      });
      return response.data;
    },
    getCaresForCalendar: async (params: { from: string; to: string }) => {
      const response = await axiosInstance.get<SittingCare[]>("/sitting/calendar/cares", {
        params,
      });
      return response.data;
    },
    updateClient: async (clientId: string, dto: UpdateClientDto) => {
      const response = await axiosInstance.patch<SittingClient>(
        `/sitting/clients/${clientId}`,
        dto
      );
      return response.data;
    },
    updateBooking: async (bookingId: string, dto: UpdateBookingDto) => {
      const response = await axiosInstance.patch<SittingBooking>(
        `/sitting/bookings/${bookingId}`,
        dto
      );
      return response.data;
    },
    updateBookingStatus: async (bookingId: string, bookingStatus: string) => {
      const response = await axiosInstance.patch<SittingBooking>(
        `/sitting/bookings/${bookingId}/status`,
        { bookingStatus }
      );
      return response.data;
    },
    updatePaymentStatus: async (bookingId: string, paymentStatus: string) => {
      const response = await axiosInstance.patch<SittingBooking>(
        `/sitting/bookings/${bookingId}/payment-status`,
        { paymentStatus }
      );
      return response.data;
    },
    updateCare: async (careId: string, dto: UpdateCareDto) => {
      const response = await axiosInstance.patch<SittingCare>(
        `/sitting/cares/${careId}`,
        dto
      );
      return response.data;
    },
    createClient: async (dto: CreateClientDto) => {
      const response = await axiosInstance.post<SittingClient>("/sitting/clients", dto);
      return response.data;
    },
    deleteClient: async (clientId: string) => {
      const response = await axiosInstance.delete(`/sitting/clients/${clientId}`);
      return response.data;
    },
    createBooking: async (dto: CreateBookingDto) => {
      const response = await axiosInstance.post<SittingBooking>("/sitting/bookings", dto);
      return response.data;
    },
    deleteBooking: async (bookingId: string) => {
      const response = await axiosInstance.delete(`/sitting/bookings/${bookingId}`);
      return response.data;
    },
    createCare: async (dto: CreateCareDto) => {
      const response = await axiosInstance.post<SittingCare>("/sitting/cares", dto);
      return response.data;
    },
    deleteCare: async (careId: string) => {
      const response = await axiosInstance.delete(`/sitting/cares/${careId}`);
      return response.data;
    },
  },
};
