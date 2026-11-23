package com.RentACarDemo.user.dto;

import com.RentACarDemo.cars.Cars;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDto {
    Long id;
    String name;
    String email;
    private Cars bookedCar;

}
