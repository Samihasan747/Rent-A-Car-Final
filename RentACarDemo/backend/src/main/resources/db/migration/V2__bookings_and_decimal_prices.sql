-- Phase B: reservations become first-class rows and money becomes exact.
--
-- user_table.booked_car and cars_table.is_booked are kept as legacy mirrors only.
-- The authoritative source for reservations and date-based availability is bookings.

-- Guard against NULL prices from the pre-Flyway era before adding NOT NULL.
UPDATE cars_table SET price = 0.00 WHERE price IS NULL;

ALTER TABLE cars_table
    MODIFY COLUMN price DECIMAL(12, 2) NOT NULL;

CREATE TABLE bookings
(
    booking_id   BIGINT         NOT NULL AUTO_INCREMENT,
    user_id      BIGINT         NOT NULL,
    car_id       BIGINT         NOT NULL,
    start_date   DATE           NOT NULL,
    end_date     DATE           NOT NULL,
    daily_price  DECIMAL(12, 2) NOT NULL,
    total_price  DECIMAL(12, 2) NOT NULL,
    status       VARCHAR(20)    NOT NULL,
    created_at   DATETIME(6)    NOT NULL,
    cancelled_at DATETIME(6)    NULL,
    PRIMARY KEY (booking_id),
    KEY idx_bookings_car_dates (car_id, start_date, end_date),
    KEY idx_bookings_user_dates (user_id, start_date, end_date),
    KEY idx_bookings_status (status),
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES user_table (user_id),
    CONSTRAINT fk_bookings_car FOREIGN KEY (car_id) REFERENCES cars_table (car_id),
    CONSTRAINT chk_bookings_dates CHECK (end_date >= start_date)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
