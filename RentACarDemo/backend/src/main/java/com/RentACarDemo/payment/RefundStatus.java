package com.RentACarDemo.payment;

/**
 * Refund handling status for a payment.
 *
 * Automated gateway refunds are deferred; these statuses track the
 * outstanding refund obligation for administrators.
 */
public enum RefundStatus {
    NONE,
    PENDING,
    PROCESSING,
    REFUNDED,
    FAILED
}