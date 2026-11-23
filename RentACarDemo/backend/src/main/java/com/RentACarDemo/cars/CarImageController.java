package com.RentACarDemo.cars;

import com.RentACarDemo.cars.dto.CarImageDto;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
public class CarImageController {

    private final CarImageService carImageService;

    public CarImageController(CarImageService carImageService) {
        this.carImageService = carImageService;
    }

    @PostMapping("/api/admin/cars/{carId}/images")
    public ResponseEntity<List<CarImageDto>> uploadImages(
            @PathVariable Long carId,
            @RequestParam("files") List<MultipartFile> files) {
        List<CarImageDto> created = carImageService.uploadImages(carId, files);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/api/admin/cars/{carId}/images/{imageId}")
    public ResponseEntity<Void> deleteImage(
            @PathVariable Long carId,
            @PathVariable Long imageId) {
        carImageService.deleteImage(carId, imageId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/api/admin/cars/{carId}/images/{imageId}/primary")
    public ResponseEntity<CarImageDto> setPrimary(
            @PathVariable Long carId,
            @PathVariable Long imageId) {
        CarImageDto dto = carImageService.setPrimary(carId, imageId);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/api/cars/{carId}/images")
    public ResponseEntity<List<CarImageDto>> listImages(@PathVariable Long carId) {
        return ResponseEntity.ok(carImageService.listImages(carId));
    }

    @GetMapping("/api/cars/{carId}/images/{imageId}")
    public ResponseEntity<byte[]> getImage(
            @PathVariable Long carId,
            @PathVariable Long imageId) {
        byte[] bytes = carImageService.readImageBytes(carId, imageId);
        String contentType = carImageService.getImageContentType(carId, imageId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic())
                .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(bytes.length))
                .body(bytes);
    }
}
