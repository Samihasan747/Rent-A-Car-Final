package com.RentACarDemo.cars.customUser;

import com.RentACarDemo.user.Role;
import com.RentACarDemo.user.User;
import com.RentACarDemo.user.UserRepository;
import com.RentACarDemo.exceptions.ConflictException;
import com.RentACarDemo.user.dto.UserRequestDto;
import com.RentACarDemo.user.dto.UserResponseDto;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    public UserRepository userRepository;
    public PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder){
        this.userRepository=userRepository;
        this.passwordEncoder=passwordEncoder;
    }

    public UserResponseDto register(UserRequestDto userReq){

        String email = userReq.getEmail().trim();

        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("Email already exists!");
        }

        User user = mapToUser(userReq);

        userRepository.save(user);

        UserResponseDto userResp = mapToDto(user);

        return userResp;
    }

//-------------------//
    private User mapToUser(UserRequestDto userReq){
        User user = new User();

        user.setName(userReq.getName());
        user.setEmail(userReq.getEmail().trim());

        String encodedPassword = passwordEncoder.encode(userReq.getPassword());
        user.setPassword(encodedPassword);

        user.setRole(Role.CUSTOMER);
        user.setDeleted(false);

        return user;
    }

    private UserResponseDto mapToDto(User user){
        UserResponseDto userResp = new UserResponseDto();

        userResp.setId(user.getId());
        userResp.setName(user.getName());
        userResp.setEmail(user.getEmail());
        userResp.setBookedCar(user.getBookedCar());

        return userResp;
    }
}
