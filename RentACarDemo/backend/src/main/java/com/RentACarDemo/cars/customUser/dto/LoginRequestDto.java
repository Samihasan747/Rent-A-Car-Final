package com.RentACarDemo.cars.customUser.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequestDto {

    @NotBlank(message = "Please Enter your Email")
    @Email(message = "Invalid Email format")
    String email;

    @NotBlank(message = "Please Enter your Password")
    @Size(min = 8, message = "Password must be at least 8 character long")
    String password;

}
