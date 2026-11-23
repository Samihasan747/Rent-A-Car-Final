package com.RentACarDemo.booking.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateBookingRequestDto {

    @NotNull(message = "carId is required")
    Long carId;

    /** First rental day, inclusive. */
    @NotNull(message = "startDate is required")
    LocalDate startDate;

    /** Last rental day, inclusive. */
    @NotNull(message = "endDate is required")
    LocalDate endDate;
}
