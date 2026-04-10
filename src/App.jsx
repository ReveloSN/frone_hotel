import { startTransition, useMemo, useState } from "react";
import SectionCard from "./components/SectionCard";
import { hotelApi } from "./services/api";

const initialSearch = {
  checkInDate: "",
  checkOutDate: "",
  roomType: "SINGLE"
};

const initialReservationForm = {
  guestName: "",
  guestEmail: ""
};

const roomTypeLabels = {
  SINGLE: "Single",
  DOUBLE: "Double",
  SUITE: "Suite"
};

const seasonLabels = {
  HIGH: "High",
  LOW: "Low"
};

const serviceOptions = [
  { type: "SPA", label: "Spa", helper: "$50 once" },
  { type: "BREAKFAST", label: "Breakfast", helper: "$15 per day" },
  { type: "TRANSFER", label: "Transfer", helper: "$30 once" }
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

function formatCurrency(value) {
  return currencyFormatter.format(value ?? 0);
}

export default function App() {
  const [search, setSearch] = useState(initialSearch);
  const [reservationForm, setReservationForm] = useState(initialReservationForm);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [reservation, setReservation] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Search for available rooms to start the reservation flow.");
  const [loading, setLoading] = useState(false);

  const nights = useMemo(() => {
    if (!search.checkInDate || !search.checkOutDate) return 0;
    const start = new Date(search.checkInDate);
    const end = new Date(search.checkOutDate);
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [search.checkInDate, search.checkOutDate]);

  const selectedRoom = useMemo(
    () => availableRooms.find((room) => room.roomId === selectedRoomId) ?? null,
    [availableRooms, selectedRoomId]
  );

  const addedServices = new Set(reservation?.services ?? []);
  const canCheckIn = reservation?.status === "RESERVED";
  const canCheckOut = reservation?.status === "CHECKED_IN";

  const updateSearch = (event) => {
    const { name, value } = event.target;
    setSearch((current) => ({ ...current, [name]: value }));
  };

  const updateReservationForm = (event) => {
    const { name, value } = event.target;
    setReservationForm((current) => ({ ...current, [name]: value }));
  };

  const searchAvailability = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const rooms = await hotelApi.getAvailability(search);

      startTransition(() => {
        setAvailableRooms(rooms);
        setSelectedRoomId(rooms[0]?.roomId ?? "");
        setReservation(null);
        setInvoice(null);
        setHasSearched(true);
      });

      setStatusMessage(
        rooms.length > 0
          ? `${rooms.length} ${roomTypeLabels[search.roomType].toLowerCase()} room(s) found for the selected stay.`
          : "No rooms are available for the selected dates and room type."
      );
    } catch (error) {
      startTransition(() => {
        setAvailableRooms([]);
        setSelectedRoomId("");
        setHasSearched(true);
      });
      setStatusMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createReservation = async (event) => {
    event.preventDefault();
    if (!selectedRoom) {
      setStatusMessage("Select a room before creating the reservation.");
      return;
    }

    setLoading(true);

    try {
      const createdReservation = await hotelApi.createReservation({
        guestName: reservationForm.guestName,
        guestEmail: reservationForm.guestEmail,
        roomId: selectedRoom.roomId,
        roomType: selectedRoom.roomType,
        checkInDate: search.checkInDate,
        checkOutDate: search.checkOutDate
      });

      startTransition(() => {
        setReservation(createdReservation);
        setInvoice(null);
      });
      setStatusMessage(createdReservation.message);
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshReservation = async () => {
    if (!reservation?.reservationId) return;
    const updatedReservation = await hotelApi.getReservation(reservation.reservationId);
    startTransition(() => {
      setReservation(updatedReservation);
    });
  };

  const addService = async (serviceType) => {
    if (!reservation?.reservationId) return;
    setLoading(true);

    try {
      const updatedReservation = await hotelApi.addService(reservation.reservationId, serviceType);
      startTransition(() => {
        setReservation(updatedReservation);
      });
      setStatusMessage(updatedReservation.message);
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const doCheckIn = async () => {
    if (!reservation?.reservationId) return;
    setLoading(true);

    try {
      const updatedReservation = await hotelApi.checkIn(reservation.reservationId);
      startTransition(() => {
        setReservation(updatedReservation);
      });
      setStatusMessage(updatedReservation.message);
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const doCheckOut = async () => {
    if (!reservation?.reservationId) return;
    setLoading(true);

    try {
      const finalInvoice = await hotelApi.checkOut(reservation.reservationId);
      await refreshReservation();
      startTransition(() => {
        setInvoice(finalInvoice);
      });
      setStatusMessage(finalInvoice.message);
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-copy">
          <span className="badge">Facade Pattern Hotel System</span>
          <h1>Hotel Reservation System</h1>
          <p>
            Search the stay, select the exact room, create the reservation, manage services,
            generate the digital key, and close the stay with a server-generated invoice.
          </p>
        </div>

        <div className="hero-panel">
          <p className="hero-panel-title">Facade-driven flow</p>
          <p>Client UI -&gt; HotelFacade -&gt; RoomService, RateService, ExtraServiceService, BillingService, AccessService</p>
        </div>
      </header>

      <div className="status-bar">
        <strong>System message:</strong> {statusMessage}
      </div>

      <main className="grid">
        <SectionCard
          title="1. Search Availability"
          subtitle="Choose the stay dates and room type to view live room availability."
        >
          <form className="form-grid" onSubmit={searchAvailability}>
            <label>
              Check-in date
              <input type="date" name="checkInDate" value={search.checkInDate} onChange={updateSearch} required />
            </label>

            <label>
              Check-out date
              <input type="date" name="checkOutDate" value={search.checkOutDate} onChange={updateSearch} required />
            </label>

            <label>
              Room type
              <select name="roomType" value={search.roomType} onChange={updateSearch}>
                <option value="SINGLE">Single</option>
                <option value="DOUBLE">Double</option>
                <option value="SUITE">Suite</option>
              </select>
            </label>

            <button type="submit" disabled={loading}>
              {loading ? "Searching..." : "Search rooms"}
            </button>
          </form>

          <div className="info-line">
            <span>Nights selected: {nights}</span>
            <span>Requested type: {roomTypeLabels[search.roomType]}</span>
          </div>
        </SectionCard>

        <SectionCard
          title="2. Select a Room"
          subtitle="Choose the exact room and review the dynamic price preview before reserving."
        >
          {!hasSearched ? (
            <p className="muted">Search results will appear here after you submit the stay details.</p>
          ) : availableRooms.length === 0 ? (
            <p className="muted">No rooms matched the current search.</p>
          ) : (
            <div className="stack">
              <div className="room-grid">
                {availableRooms.map((room) => {
                  const isSelected = room.roomId === selectedRoomId;
                  return (
                    <article key={room.roomId} className={`room-card${isSelected ? " room-card-selected" : ""}`}>
                      <div>
                        <p className="eyebrow">Room {room.roomNumber}</p>
                        <h3>{roomTypeLabels[room.roomType]} room</h3>
                        <p className="muted">
                          {room.nights} night(s), {seasonLabels[room.season]} season, multiplier x{room.seasonMultiplier}
                        </p>
                      </div>

                      <div className="room-price">
                        <strong>{formatCurrency(room.estimatedTotal)}</strong>
                        <span>{formatCurrency(room.nightlyRate)} per night</span>
                      </div>

                      <button
                        type="button"
                        className={isSelected ? "button-secondary" : ""}
                        onClick={() => setSelectedRoomId(room.roomId)}
                      >
                        {isSelected ? "Selected" : "Select room"}
                      </button>
                    </article>
                  );
                })}
              </div>

              <div className="summary">
                <h3>Selected room preview</h3>
                {!selectedRoom ? (
                  <p className="muted">Select a room to preview the reservation pricing.</p>
                ) : (
                  <div className="summary-grid">
                    <p><strong>Room:</strong> {selectedRoom.roomNumber}</p>
                    <p><strong>Type:</strong> {roomTypeLabels[selectedRoom.roomType]}</p>
                    <p><strong>Season:</strong> {seasonLabels[selectedRoom.season]}</p>
                    <p><strong>Nights:</strong> {selectedRoom.nights}</p>
                    <p><strong>Nightly rate:</strong> {formatCurrency(selectedRoom.nightlyRate)}</p>
                    <p><strong>Estimated total:</strong> {formatCurrency(selectedRoom.estimatedTotal)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="3. Create Reservation"
          subtitle="Enter the guest details and confirm the selected room."
        >
          <form className="form-grid" onSubmit={createReservation}>
            <label>
              Guest name
              <input
                type="text"
                name="guestName"
                value={reservationForm.guestName}
                onChange={updateReservationForm}
                placeholder="Jane Doe"
                required
              />
            </label>

            <label>
              Guest email
              <input
                type="email"
                name="guestEmail"
                value={reservationForm.guestEmail}
                onChange={updateReservationForm}
                placeholder="jane@example.com"
                required
              />
            </label>

            <button type="submit" disabled={loading || !selectedRoom || nights === 0}>
              {loading ? "Creating..." : "Create reservation"}
            </button>
          </form>

          <div className="selected-room-banner">
            {selectedRoom ? (
              <span>
                Reserving room {selectedRoom.roomNumber} for {formatCurrency(selectedRoom.estimatedTotal)}
              </span>
            ) : (
              <span>Select a room to enable reservation creation.</span>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="4. Reservation Management"
          subtitle="Add services, review the reservation summary, and complete check-in and check-out."
        >
          {!reservation ? (
            <p className="muted">Create a reservation to unlock reservation management.</p>
          ) : (
            <div className="stack">
              <div className="summary">
                <h3>Reservation summary</h3>
                <div className="summary-grid">
                  <p><strong>Reservation ID:</strong> {reservation.reservationId}</p>
                  <p><strong>Status:</strong> {reservation.status}</p>
                  <p><strong>Guest:</strong> {reservation.guestName}</p>
                  <p><strong>Email:</strong> {reservation.guestEmail}</p>
                  <p><strong>Room:</strong> {reservation.roomNumber}</p>
                  <p><strong>Type:</strong> {roomTypeLabels[reservation.roomType]}</p>
                  <p><strong>Stay:</strong> {reservation.checkInDate} to {reservation.checkOutDate}</p>
                  <p><strong>Season:</strong> {seasonLabels[reservation.season]}</p>
                  <p><strong>Nightly rate:</strong> {formatCurrency(reservation.nightlyRate)}</p>
                  <p><strong>Room total:</strong> {formatCurrency(reservation.roomTotal)}</p>
                  <p><strong>Extras total:</strong> {formatCurrency(reservation.extrasTotal)}</p>
                  <p><strong>Current total:</strong> {formatCurrency(reservation.grandTotal)}</p>
                </div>
                <p><strong>Digital key:</strong> {reservation.digitalKeyCode || "Not generated yet"}</p>
              </div>

              <div>
                <h3>Add extra services</h3>
                <div className="service-grid">
                  {serviceOptions.map((service) => {
                    const alreadyAdded = addedServices.has(service.label);
                    return (
                      <button
                        key={service.type}
                        type="button"
                        className="service-button"
                        disabled={loading || reservation.status === "CHECKED_OUT" || alreadyAdded}
                        onClick={() => addService(service.type)}
                      >
                        <span>{service.label}</span>
                        <small>{alreadyAdded ? "Added" : service.helper}</small>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="button-row">
                <button type="button" onClick={doCheckIn} disabled={loading || !canCheckIn}>
                  Check in
                </button>
                <button type="button" onClick={doCheckOut} disabled={loading || !canCheckOut}>
                  Check out
                </button>
              </div>

              <div>
                <h3>Selected services</h3>
                {reservation.services?.length ? (
                  <div className="pill-row">
                    {reservation.services.map((service) => (
                      <span key={service} className="pill">{service}</span>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No extra services added yet.</p>
                )}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="5. Final Invoice"
          subtitle="The final invoice is generated by the server during check-out."
        >
          {!invoice ? (
            <p className="muted">Complete check-out to display the final invoice.</p>
          ) : (
            <div className="stack">
              <div className="summary">
                <h3>Invoice summary</h3>
                <div className="summary-grid">
                  <p><strong>Reservation ID:</strong> {invoice.reservationId}</p>
                  <p><strong>Guest:</strong> {invoice.guestName}</p>
                  <p><strong>Email:</strong> {invoice.guestEmail}</p>
                  <p><strong>Room:</strong> {invoice.roomNumber}</p>
                  <p><strong>Type:</strong> {roomTypeLabels[invoice.roomType]}</p>
                  <p><strong>Status:</strong> {invoice.status}</p>
                </div>
              </div>

              <div className="invoice-table">
                <div className="invoice-row invoice-row-head">
                  <span>Code</span>
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                {invoice.lineItems.map((item) => (
                  <div key={`${item.code}-${item.label}`} className="invoice-row">
                    <span>{item.code}</span>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="invoice-totals">
                <p><strong>Room total:</strong> {formatCurrency(invoice.roomTotal)}</p>
                <p><strong>Extras total:</strong> {formatCurrency(invoice.extrasTotal)}</p>
                <p><strong>Grand total:</strong> {formatCurrency(invoice.grandTotal)}</p>
              </div>
            </div>
          )}
        </SectionCard>
      </main>
    </div>
  );
}
