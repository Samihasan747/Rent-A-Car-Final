package com.RentACarDemo.user;

import com.RentACarDemo.cars.customUser.AuthService;
import com.RentACarDemo.security.CurrentUserProvider;
import com.RentACarDemo.user.dto.UpdateProfileRequestDto;
import com.RentACarDemo.user.dto.UserRequestDto;
import com.RentACarDemo.user.dto.UserResponseDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserService userService;
    private final AuthService authService;
    private final CurrentUserProvider currentUserProvider;

    public UserController(
            UserService userService,
            AuthService authService,
            CurrentUserProvider currentUserProvider) {
        this.userService = userService;
        this.authService = authService;
        this.currentUserProvider = currentUserProvider;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponseDto> createUser(@Valid @RequestBody UserRequestDto userRequestDto){
        UserResponseDto userResp = authService.register(userRequestDto);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(userResp);
    }

    @PostMapping("/book/{cid}")
    public ResponseEntity<String> createBooking(@PathVariable Long cid, Authentication authentication){

        User user = currentUserProvider.require(authentication);

        userService.createBooking(user.getId(), cid);

        return ResponseEntity.ok("Done");
    }

    @PostMapping("/cancel")
    public ResponseEntity<String> cancelBooking(Authentication authentication){
        User user = currentUserProvider.require(authentication);

        userService.cancelBooking(user.getId());

        return ResponseEntity.ok("Booking Canceled");
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponseDto> getUser(Authentication authentication){
        User user = currentUserProvider.require(authentication);

        UserResponseDto userResp = userService.getUser(user.getId());

        return ResponseEntity.ok(userResp);
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponseDto> updateUser(
            @Valid @RequestBody UpdateProfileRequestDto updateProfileRequestDto,
            Authentication authentication){
        User user = currentUserProvider.require(authentication);

        UserResponseDto userResp = userService.updateProfile(updateProfileRequestDto, user.getId());
        return ResponseEntity.ok(userResp);
    }

    @PatchMapping("/me")
    public ResponseEntity<String> softDelete(Authentication authentication){
        User user = currentUserProvider.require(authentication);

        userService.softDelete(user.getId());
        return ResponseEntity
                .status(HttpStatus.NO_CONTENT)
                .build();
    }
}
