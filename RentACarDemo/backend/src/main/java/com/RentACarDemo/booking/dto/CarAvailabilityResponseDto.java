package com.RentACarDemo.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CarAvailabilityResponseDto {

    Long carId;
    LocalDate startDate;
    LocalDate endDate;
    boolean available;
}
