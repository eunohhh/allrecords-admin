export const QUERY_KEYS = {
  SITTING: {
    CLIENTS: ["sitting", "clients"] as const,
    BOOKINGS: (clientId?: string, status?: string) =>
      ["sitting", "bookings", { clientId, status }] as const,
    CARES: (bookingId: string) => ["sitting", "cares", bookingId] as const,
  },
  CAT_PHOTOS: {
    GALLERIES: ["cat-photos", "galleries"] as const,
    SHARES: ["cat-photos", "shares"] as const,
    PHOTOS: (ownerId?: string) => ["cat-photos", "photos", { ownerId }] as const,
    PHOTO: (id: string) => ["cat-photos", "photo", id] as const,
    CATS: (ownerId?: string) => ["cat-photos", "cats", { ownerId }] as const,
    SEARCH: (q: string, ownerId?: string) =>
      ["cat-photos", "search", { q, ownerId }] as const,
  },
};
