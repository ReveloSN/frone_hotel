function normalizeApiBaseUrl(rawValue) {
  if (!rawValue) {
    return "/api/hotel";
  }

  let value = rawValue.trim();
  if (!value) {
    return "/api/hotel";
  }

  if (!/^https?:\/\//i.test(value) && !value.startsWith("/")) {
    value = `https://${value}`;
  }

  value = value.replace(/\/$/, "");

  if (value === "/api" || value.endsWith("/api")) {
    return `${value}/hotel`;
  }

  if (value === "/api/hotel" || value.endsWith("/api/hotel")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${value}/api/hotel`;
  }

  return `${value}/api/hotel`;
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL ?? "/api/hotel");

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
