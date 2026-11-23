package com.RentACarDemo.booking;

/**
 * Lifecycle of a reservation.
 *
 * <ul>
 *   <li>{@code PENDING_PAYMENT} – created, awaiting full advance payment; vehicle reserved during the payment window.</li>
 *   <li>{@code CONFIRMED} – payment verified; the rental is booked and blocks the car's dates.</li>
 *   <li>{@code CANCELLED} – released by the customer or an administrator; never blocks dates.</li>
 *   <li>{@code COMPLETED} – the rental period ended; kept as history, never blocks dates.</li>
 *   <li>{@code EXPIRED} – unpaid reservation that passed its payment window; released, never blocks dates.</li>
 * </ul>
 */
public enum BookingStatus {
    PENDING_PAYMENT,
    CONFIRMED,
    CANCELLED,
    COMPLETED,
    EXPIRED
}
