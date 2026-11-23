-- Baseline schema.
--
-- The application predates Flyway, so existing databases already contain these
-- tables (created by Hibernate). Every statement here is a no-op on such a
-- database and creates the tables on an empty one.
--
-- cars_table is created first because user_table.booked_car references it.

CREATE TABLE IF NOT EXISTS cars_table (
    car_id    BIGINT NOT NULL AUTO_INCREMENT,
    name      VARCHAR(255),
    model     VARCHAR(255),
    is_booked BIT(1),
    price     DECIMAL(12, 2),
    PRIMARY KEY (car_id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS user_table (
    user_id    BIGINT NOT NULL AUTO_INCREMENT,
    name       VARCHAR(255),
    email      VARCHAR(255),
    password   VARCHAR(255),
    role       ENUM ('ADMIN', 'CUSTOMER'),
    booked_car BIGINT,
    is_deleted BIT(1),
    PRIMARY KEY (user_id),
    UNIQUE KEY uk_user_email (email),
    UNIQUE KEY uk_user_booked_car (booked_car),
    CONSTRAINT fk_user_booked_car FOREIGN KEY (booked_car) REFERENCES cars_table (car_id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
