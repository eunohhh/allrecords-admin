export const QUERY_KEYS = {
  SITTING: {
    CLIENTS: ["sitting", "clients"] as const,
    BOOKINGS: (clientId?: string, status?: string) =>
      ["sitting", "bookings", { clientId, status }] as const,
    CARES: (bookingId: string) => ["sitting", "cares", bookingId] as const,
  },
};
