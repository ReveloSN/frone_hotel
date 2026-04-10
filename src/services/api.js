const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api/hotel").replace(/\/$/, "");

async function request(path, options = {}) {
  const headers = options.body ? { "Content-Type": "application/json" } : {};
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong while calling the API.");
  }

  return data;
}

export const hotelApi = {
  getAvailability({ checkInDate, checkOutDate, roomType }) {
    const params = new URLSearchParams({ checkInDate, checkOutDate, roomType });
    return request(`/disponibilidad?${params.toString()}`);
  },

  createReservation(payload) {
    return request("/reservar", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  getReservation(reservationId) {
    return request(`/reserva/${reservationId}`);
  },

  addService(reservationId, serviceType) {
    return request(`/servicios/${reservationId}`, {
      method: "POST",
      body: JSON.stringify({ serviceType })
    });
  },

  checkIn(reservationId) {
    return request(`/checkin/${reservationId}`, {
      method: "PUT"
    });
  },

  checkOut(reservationId) {
    return request(`/checkout/${reservationId}`, {
      method: "PUT"
    });
  }
};
