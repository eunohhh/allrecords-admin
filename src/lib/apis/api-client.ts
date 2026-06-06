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

// ── Cat Photos ────────────────────────────────────────────────────────────
export type MediaType = "PHOTO" | "VIDEO";
export type MediaStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";

export interface Photo {
  id: string;
  ownerId: string;
  mediaType: MediaType;
  width: number | null;
  height: number | null;
  takenAt: string | null;
  sortAt: string;
  thumbUrl: string | null;
  previewUrl: string | null;
  videoUrl: string | null;
  procStatus: MediaStatus;
  aiStatus: MediaStatus;
  catStatus: MediaStatus;
  aiTags: string[];
  aiCaption: string | null;
  hasCat: boolean | null;
  catNames: string[];
  durationMs: number | null;
  memo: string | null;
  createdAt: string;
}

export interface PhotoPage {
  items: Photo[];
  nextCursor: string | null;
}

export interface GallerySummary {
  ownerId: string;
  ownerName: string;
  isOwner: boolean;
}

export interface ShareMember {
  memberUserId: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface CatSummary {
  id: string;
  name: string;
  photoCount: number;
  coverThumbUrl: string | null;
}

export interface UploadUrlDto {
  mimeType: string;
  sizeBytes: number;
  ownerId?: string;
}

export interface UploadUrlResponse {
  photoId: string;
  key: string;
  uploadUrl: string;
  expiresAt: string;
}

export interface ConfirmPhotoDto {
  key: string;
  width?: number;
  height?: number;
  takenAt?: string;
  originalFileName?: string;
  memo?: string;
}

export interface UpdatePhotoDto {
  memo?: string;
  takenAt?: string;
}

export interface CreateCatDto {
  name: string;
  ownerId?: string;
}

export interface AddShareDto {
  email: string;
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
  catPhotos: {
    photos: {
      getUploadUrl: async (dto: UploadUrlDto) => {
        const response = await axiosInstance.post<UploadUrlResponse>(
          "/photos/upload-url",
          dto
        );
        return response.data;
      },
      // ⚠️ Presigned S3 URL: plain fetch, NO Authorization header (axiosInstance
      // would inject the Bearer token and break the signature). Content-Type only.
      uploadToS3: async (uploadUrl: string, file: File) => {
        const res = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok) {
          throw new Error(`S3 업로드 실패 (${res.status})`);
        }
      },
      confirm: async (photoId: string, dto: ConfirmPhotoDto) => {
        const response = await axiosInstance.post<Photo>(
          `/photos/${photoId}/confirm`,
          dto
        );
        return response.data;
      },
      list: async (ownerId?: string, cursor?: string, limit?: number) => {
        const response = await axiosInstance.get<PhotoPage>("/photos", {
          params: { ownerId, cursor, limit },
        });
        return response.data;
      },
      get: async (photoId: string) => {
        const response = await axiosInstance.get<Photo>(`/photos/${photoId}`);
        return response.data;
      },
      search: async (q: string, ownerId?: string, limit?: number) => {
        const response = await axiosInstance.get<Photo[]>("/photos/search", {
          params: { q, ownerId, limit },
        });
        return response.data;
      },
      update: async (photoId: string, dto: UpdatePhotoDto) => {
        const response = await axiosInstance.patch<Photo>(
          `/photos/${photoId}`,
          dto
        );
        return response.data;
      },
      retry: async (photoId: string) => {
        const response = await axiosInstance.post<Photo>(
          `/photos/${photoId}/retry`
        );
        return response.data;
      },
      remove: async (photoId: string) => {
        const response = await axiosInstance.delete<{ ok: boolean }>(
          `/photos/${photoId}`
        );
        return response.data;
      },
      addCat: async (photoId: string, catId: string) => {
        const response = await axiosInstance.post<Photo>(
          `/photos/${photoId}/cats`,
          { catId }
        );
        return response.data;
      },
      removeCat: async (photoId: string, catId: string) => {
        const response = await axiosInstance.delete<Photo>(
          `/photos/${photoId}/cats/${catId}`
        );
        return response.data;
      },
    },
    galleries: {
      list: async () => {
        const response = await axiosInstance.get<GallerySummary[]>("/galleries");
        return response.data;
      },
      listShares: async () => {
        const response = await axiosInstance.get<ShareMember[]>(
          "/galleries/shares"
        );
        return response.data;
      },
      addShare: async (email: string) => {
        const response = await axiosInstance.post<ShareMember>(
          "/galleries/shares",
          { email }
        );
        return response.data;
      },
      removeShare: async (memberUserId: string) => {
        const response = await axiosInstance.delete<{ ok: boolean }>(
          `/galleries/shares/${memberUserId}`
        );
        return response.data;
      },
    },
    cats: {
      list: async (ownerId?: string) => {
        const response = await axiosInstance.get<CatSummary[]>("/cats", {
          params: { ownerId },
        });
        return response.data;
      },
      create: async (dto: CreateCatDto) => {
        const response = await axiosInstance.post<CatSummary>("/cats", dto);
        return response.data;
      },
      rename: async (catId: string, name: string) => {
        const response = await axiosInstance.patch<{ ok: boolean }>(
          `/cats/${catId}`,
          { name }
        );
        return response.data;
      },
      remove: async (catId: string) => {
        const response = await axiosInstance.delete<{ ok: boolean }>(
          `/cats/${catId}`
        );
        return response.data;
      },
      reindex: async (ownerId?: string) => {
        const response = await axiosInstance.post<{ armed: number }>(
          "/cats/reindex",
          { ownerId }
        );
        return response.data;
      },
    },
  },
};
