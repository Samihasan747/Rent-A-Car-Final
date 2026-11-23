-- Car image metadata. Binary files are stored on the filesystem under ./uploads/cars; this
-- table holds metadata and the primary flag.
--
-- Existing cars have no images and continue to work via the frontend fallback.

CREATE TABLE IF NOT EXISTS car_images (
    image_id     BIGINT NOT NULL AUTO_INCREMENT,
    car_id       BIGINT NOT NULL,
    file_name    VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes   BIGINT NOT NULL,
    is_primary   BIT(1) NOT NULL DEFAULT 0,
    sort_order   INT NOT NULL DEFAULT 0,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (image_id),
    CONSTRAINT fk_car_images_car FOREIGN KEY (car_id)
        REFERENCES cars_table (car_id) ON DELETE CASCADE,
    INDEX idx_car_images_car (car_id),
    INDEX idx_car_images_primary (car_id, is_primary)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
