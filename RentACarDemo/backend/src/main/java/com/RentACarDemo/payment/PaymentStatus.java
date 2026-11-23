package com.RentACarDemo.payment;

/**
 * Lifecycle of a payment attempt.
 *
 * <ul>
 *   <li>{@code INITIATED} – payment attempt created, awaiting gateway redirect.</li>
 *   <li>{@code PENDING} – gateway session created, awaiting customer action.</li>
 *   <li>{@code VALID} – independently verified as successful.</li>
 *   <li>{@code FAILED} – declined by issuer/gateway.</li>
 *   <li>{@code CANCELLED} – cancelled by customer at gateway.</li>
 *   <li>{@code EXPIRED} – payment window closed without success.</li>
 * </ul>
 */
public enum PaymentStatus {
    INITIATED,
    PENDING,
    VALID,
    FAILED,
    CANCELLED,
    EXPIRED
}