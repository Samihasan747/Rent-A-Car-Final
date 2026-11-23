package com.RentACarDemo.booking.dto;

import com.RentACarDemo.booking.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BookingResponseDto {

    Long id;
    Long userId;
    String customerName;
    String customerEmail;
    Long carId;
    String carName;
    String carModel;
    LocalDate startDate;
    LocalDate endDate;
    long days;
    BigDecimal dailyPrice;
    BigDecimal totalPrice;
    BookingStatus status;
    Instant createdAt;
    Instant cancelledAt;
}
