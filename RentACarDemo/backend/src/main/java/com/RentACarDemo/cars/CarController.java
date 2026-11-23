package com.RentACarDemo.cars;

import com.RentACarDemo.booking.dto.CarAvailabilityResponseDto;
import com.RentACarDemo.cars.dto.CarRespondDto;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/cars")
public class CarController {

    public CarService carService;

    public CarController(CarService carService) {
        this.carService = carService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<CarRespondDto> getCar(@PathVariable Long id) {
        CarRespondDto carResp = carService.getCar(id);

        return ResponseEntity.ok(carResp);
    }

    @GetMapping
    public ResponseEntity<List<CarRespondDto>> getAllCar() {
        List<CarRespondDto> carList = carService.getAllCar();

        return ResponseEntity.ok(carList);
    }

    /**
     * Without query parameters this keeps the legacy behaviour (cars free today).
     * With {@code startDate} and {@code endDate} it returns cars with no confirmed
     * booking overlapping the inclusive range.
     */
    @GetMapping("/available")
    public ResponseEntity<List<CarRespondDto>> getAllAvailableCar(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<CarRespondDto> carList = carService.getAvailableCars(startDate, endDate);

        return ResponseEntity.ok(carList);
    }

    @GetMapping("/{id}/availability")
    public ResponseEntity<CarAvailabilityResponseDto> getCarAvailability(
            @PathVariable Long id,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        return ResponseEntity.ok(carService.getCarAvailability(id, startDate, endDate));
    }
}
