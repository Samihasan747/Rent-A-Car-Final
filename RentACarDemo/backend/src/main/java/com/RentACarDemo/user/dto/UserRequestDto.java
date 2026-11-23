package com.RentACarDemo.user.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserRequestDto {

    @NotBlank(message = "Name cannot be null")
    String name;

    @NotBlank(message = "Please Enter your Email")
    @Email(message = "Invalid Email format")
    String email;

    @NotBlank(message = "Please Enter your Password")
    @Size(min = 8, message = "Password must be at least 8 character long")
    String password;

}
