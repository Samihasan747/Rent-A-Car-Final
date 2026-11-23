-- Payment records. Binary gateway credentials are never stored; only
-- transaction references, amounts, statuses and audit timestamps.

CREATE TABLE IF NOT EXISTS payments (
    payment_id       BIGINT NOT NULL AUTO_INCREMENT,
    booking_id       BIGINT NOT NULL,
    tran_id          VARCHAR(64) NOT NULL,
    gateway_tran_id  VARCHAR(80),
    val_id           VARCHAR(64),
    amount           DECIMAL(12,2) NOT NULL,
    currency         VARCHAR(3) NOT NULL DEFAULT 'BDT',
    payment_method   VARCHAR(50),
    card_brand       VARCHAR(30),
    card_issuer      VARCHAR(100),
    card_no_masked   VARCHAR(20),
    status           VARCHAR(20) NOT NULL DEFAULT 'INITIATED',
    risk_level       INT,
    initiated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at     TIMESTAMP NULL,
    ipn_received_at  TIMESTAMP NULL,
    refund_status     VARCHAR(20) NOT NULL DEFAULT 'NONE',
    refund_amount     DECIMAL(12,2),
    refund_requested_at TIMESTAMP NULL,
    PRIMARY KEY (payment_id),
    UNIQUE KEY uq_payments_tran_id (tran_id),
    INDEX idx_payments_booking (booking_id),
    INDEX idx_payments_status (status),
    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id)
        REFERENCES bookings (booking_id) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;