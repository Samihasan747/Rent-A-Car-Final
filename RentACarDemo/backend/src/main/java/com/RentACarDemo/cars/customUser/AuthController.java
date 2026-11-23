package com.RentACarDemo.cars.customUser;

import com.RentACarDemo.cars.customUser.dto.LoginRequestDto;
import com.RentACarDemo.cars.customUser.dto.LoginResponseDto;
import com.RentACarDemo.user.User;
import com.RentACarDemo.user.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public AuthController(
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            UserRepository userRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public LoginResponseDto login(
            @RequestBody LoginRequestDto loginRequestDto) {

        Authentication authenticationRequest =
                UsernamePasswordAuthenticationToken.unauthenticated(
                        loginRequestDto.getEmail(),
                        loginRequestDto.getPassword()
                );

        Authentication authentication =
                authenticationManager.authenticate(authenticationRequest);

        User user = userRepository.findByEmailAndIsDeletedFalse(authentication.getName())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        String token = jwtService.generateToken(authentication, user.getId());

        return new LoginResponseDto(token);
    }
}
