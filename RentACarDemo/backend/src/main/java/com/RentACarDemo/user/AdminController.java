package com.RentACarDemo.user;

import com.RentACarDemo.cars.CarService;
import com.RentACarDemo.cars.customUser.AuthService;
import com.RentACarDemo.cars.dto.CarRequestDto;
import com.RentACarDemo.cars.dto.CarRespondDto;
import com.RentACarDemo.user.dto.UserResponseDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    public UserService userService;
    public CarService carService;


    public AdminController(UserService userService, AuthService authService,CarService carService){
        this.userService=userService;
        this.carService=carService;
    }

    @GetMapping("/user/all")
    public ResponseEntity<List<UserResponseDto>> getAllUser(){
        List<UserResponseDto> userList = userService.getAllUser();

        return ResponseEntity.ok(userList);
    }

    @DeleteMapping("/user/{id}")
    public ResponseEntity<String> deleteUser(@PathVariable Long id){
        userService.deleteUser(id);

        return ResponseEntity
                .status(HttpStatus.NO_CONTENT)
                .build();
    }

    @PostMapping("/cars/add")
    public ResponseEntity<CarRespondDto> createCar(@Valid @RequestBody CarRequestDto carRequestDto){
        CarRespondDto carResp = carService.createCar(carRequestDto);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(carResp);
    }

    @PutMapping("/cars/{id}")
    public ResponseEntity<CarRespondDto> updateCar(@Valid @RequestBody CarRequestDto carRequestDto, @PathVariable Long id){
        CarRespondDto carResp = carService.updateCar(carRequestDto, id);

        return ResponseEntity.ok(carResp);
    }

    @DeleteMapping("/cars/{id}")
    public ResponseEntity<String> deleteCar(@PathVariable Long id){
        carService.deleteCar(id);

        return ResponseEntity
                .status(HttpStatus.NO_CONTENT)
                .build();
    }

}
