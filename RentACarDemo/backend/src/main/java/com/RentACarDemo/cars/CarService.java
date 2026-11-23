package com.RentACarDemo.cars;

import com.RentACarDemo.booking.BookingService;
import com.RentACarDemo.booking.dto.CarAvailabilityResponseDto;
import com.RentACarDemo.cars.dto.CarRequestDto;
import com.RentACarDemo.cars.dto.CarRespondDto;
import com.RentACarDemo.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.RentACarDemo.cars.dto.CarImageDto;

@Service
public class CarService {

    public CarRepository carRepository;
    private final BookingService bookingService;
    private final CarImageRepository carImageRepository;
    private final CarImageService carImageService;

    public CarService(CarRepository carRepository, BookingService bookingService,
                      CarImageRepository carImageRepository, CarImageService carImageService) {
        this.carRepository = carRepository;
        this.bookingService = bookingService;
        this.carImageRepository = carImageRepository;
        this.carImageService = carImageService;
    }

    public CarRespondDto createCar(CarRequestDto carRequestDto) {

        Cars car = mapToEntity(carRequestDto);

        carRepository.save(car);

        return mapToDto(car);
    }

    public CarRespondDto getCar(Long id) {
        Cars car = carRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Car with id " + id + " does not exist!"));

        return mapToDto(car);
    }

    public List<CarRespondDto> getAllCar() {

        List<Cars> carList = carRepository.findAll();

        return carList.stream()
                .map(this::mapToDto)
                .toList();
    }

    /**
     * Legacy availability: cars that are not rented today. Kept byte-for-byte
     * compatible with the old endpoint; use the date-range variant for real
     * availability decisions.
     */
    public List<CarRespondDto> getAllAvailableCar() {

        bookingService.syncAllCarMirrors();

        List<Cars> carList = carRepository.findByIsBookedFalse();

        return carList.stream()
                .map(this::mapToDto)
                .toList();
    }

    /**
     * Date-based availability. The legacy {@code is_booked} flag is ignored here:
     * only confirmed bookings that overlap the requested range matter, so a car
     * with a future reservation stays available on other dates.
     */
    public List<CarRespondDto> getAvailableCars(LocalDate startDate, LocalDate endDate) {

        if (startDate == null && endDate == null) {
            return getAllAvailableCar();
        }

        return bookingService.findAvailableCars(startDate, endDate).stream()
                .map(this::mapToDto)
                .toList();
    }

    public CarAvailabilityResponseDto getCarAvailability(Long carId, LocalDate startDate, LocalDate endDate) {

        boolean available = bookingService.isCarAvailable(carId, startDate, endDate);

        return new CarAvailabilityResponseDto(carId, startDate, endDate, available);
    }

    public CarRespondDto updateCar(CarRequestDto carReq, Long id) {

        Cars car = carRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Car with id " + id + " does not exist"));

        Cars updatedCar = mapToUpdateCar(car, carReq);

        carRepository.save(car);

        CarRespondDto carResp = mapToDto(car);
        return carResp;
    }

    public void deleteCar(Long id) {
        Cars car = carRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Car with id " + id + " does not exist"));

        bookingService.prepareCarDeletion(id);

        carImageService.deleteImagesForCar(id);

        carRepository.delete(car);
    }

    //DTO Mapping

    private Cars mapToUpdateCar(Cars car, CarRequestDto carReq) {

        car.setName(carReq.getName());
        car.setModel(carReq.getModel());
        car.setPrice(carReq.getPrice());

        return car;
    }

    private Cars mapToEntity(CarRequestDto carRequestDto) {
        Cars car = new Cars();

        car.setName(carRequestDto.getName());
        car.setModel(carRequestDto.getModel());
        car.setBooked(false);
        car.setPrice(carRequestDto.getPrice());

        return car;
    }

    private CarRespondDto mapToDto(Cars car) {
        CarRespondDto carRespondDto = new CarRespondDto();

        carRespondDto.setName(car.getName());
        carRespondDto.setModel(car.getModel());
        carRespondDto.setPrice(car.getPrice());
        carRespondDto.setBooked(car.getBooked());
        carRespondDto.setId(car.getId());

        // Populate image metadata
        List<CarImage> images = carImageRepository.findByCarOrderBySortOrderAscIdAsc(car);
        List<CarImageDto> imageDtos = new ArrayList<>();
        String primaryUrl = null;
        for (CarImage img : images) {
            CarImageDto dto = new CarImageDto();
            dto.setId(img.getId());
            dto.setUrl("/api/cars/" + car.getId() + "/images/" + img.getId());
            dto.setPrimary(img.isPrimary());
            dto.setContentType(img.getContentType());
            dto.setSizeBytes(img.getSizeBytes());
            dto.setSortOrder(img.getSortOrder());
            imageDtos.add(dto);
            if (img.isPrimary()) {
                primaryUrl = dto.getUrl();
            }
        }
        // If no explicit primary but images exist, use first
        if (primaryUrl == null && !imageDtos.isEmpty()) {
            primaryUrl = imageDtos.get(0).getUrl();
        }
        carRespondDto.setImages(imageDtos);
        carRespondDto.setPrimaryImageUrl(primaryUrl);

        return carRespondDto;
    }

}
