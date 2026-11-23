package com.RentACarDemo.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request body for updating the authenticated user's profile.
 * Deliberately does not contain a password: profile updates never
 * change the password, and the old register DTO should not be reused here.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequestDto {

    @NotBlank(message = "Name cannot be null")
    @Size(max = 255, message = "Name is too long")
    String name;

    @NotBlank(message = "Please Enter your Email")
    @Email(message = "Invalid Email format")
    @Size(max = 255, message = "Email is too long")
    String email;
}
