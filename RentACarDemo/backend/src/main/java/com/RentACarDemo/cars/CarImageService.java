package com.RentACarDemo.cars;

import com.RentACarDemo.cars.dto.CarImageDto;
import com.RentACarDemo.exceptions.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class CarImageService {

    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;
    private static final int MAX_IMAGES_PER_CAR = 10;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp"
    );

    private final CarRepository carRepository;
    private final CarImageRepository carImageRepository;
    private final Path uploadRoot;

    public CarImageService(CarRepository carRepository,
                          CarImageRepository carImageRepository,
                          @Value("${app.upload.dir:./uploads/cars}") String uploadDir) {
        this.carRepository = carRepository;
        this.carImageRepository = carImageRepository;
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @Transactional
    public List<CarImageDto> uploadImages(Long carId, List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("No images provided");
        }

        Cars car = carRepository.findById(carId)
                .orElseThrow(() -> new ResourceNotFoundException("Car with id " + carId + " does not exist!"));

        long existingCount = carImageRepository.countByCar(car);
        if (existingCount + files.size() > MAX_IMAGES_PER_CAR) {
            throw new IllegalArgumentException(
                    "A car can have at most " + MAX_IMAGES_PER_CAR + " images");
        }

        boolean hasPrimary = carImageRepository.findByCarAndPrimaryTrue(car).isPresent();

        List<CarImage> created = new ArrayList<>();
        List<Path> writtenFiles = new ArrayList<>();

        try {
            for (MultipartFile file : files) {
                validateFile(file);

                String safeName = generateSafeFileName(file);
                Path carDir = uploadRoot.resolve(String.valueOf(carId)).normalize();
                if (!carDir.startsWith(uploadRoot)) {
                    throw new SecurityException("Invalid storage path");
                }
                Files.createDirectories(carDir);
                Path target = carDir.resolve(safeName).normalize();
                if (!target.startsWith(carDir)) {
                    throw new SecurityException("Invalid target path");
                }

                Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
                writtenFiles.add(target);

                CarImage image = new CarImage();
                image.setCar(car);
                image.setFileName(safeName);
                image.setContentType(normalizeContentType(file.getContentType()));
                image.setSizeBytes(file.getSize());
                image.setSortOrder((int) (existingCount + created.size()));
                image.setCreatedAt(java.time.LocalDateTime.now());

                if (!hasPrimary && created.isEmpty()) {
                    image.setPrimary(true);
                    hasPrimary = true;
                } else {
                    image.setPrimary(false);
                }

                CarImage saved = carImageRepository.save(image);
                created.add(saved);
            }
        } catch (RuntimeException e) {
            cleanupFiles(writtenFiles);
            throw e;
        } catch (IOException e) {
            cleanupFiles(writtenFiles);
            throw new RuntimeException("Failed to store image", e);
        }

        // If no primary existed before and none was set (shouldn't happen), promote first
        if (carImageRepository.findByCarAndPrimaryTrue(car).isEmpty() && !created.isEmpty()) {
            CarImage first = created.get(0);
            first.setPrimary(true);
            carImageRepository.save(first);
        }

        List<CarImageDto> dtos = new ArrayList<>();
        for (CarImage img : created) {
            dtos.add(toDto(img, carId));
        }
        return dtos;
    }

    @Transactional
    public void deleteImage(Long carId, Long imageId) {
        Cars car = carRepository.findById(carId)
                .orElseThrow(() -> new ResourceNotFoundException("Car with id " + carId + " does not exist!"));

        CarImage image = carImageRepository.findByIdAndCar(imageId, car)
                .orElseThrow(() -> new ResourceNotFoundException("Image with id " + imageId + " does not exist!"));

        boolean wasPrimary = image.isPrimary();

        carImageRepository.delete(image);
        deleteFile(carId, image.getFileName());

        if (wasPrimary) {
            carImageRepository.findFirstByCarOrderBySortOrderAscIdAsc(car)
                    .ifPresent(first -> {
                        carImageRepository.setPrimary(first.getId(), car);
                    });
        }
    }

    @Transactional
    public CarImageDto setPrimary(Long carId, Long imageId) {
        Cars car = carRepository.findById(carId)
                .orElseThrow(() -> new ResourceNotFoundException("Car with id " + carId + " does not exist!"));

        CarImage image = carImageRepository.findByIdAndCar(imageId, car)
                .orElseThrow(() -> new ResourceNotFoundException("Image with id " + imageId + " does not exist!"));

        // Both flags must be written with bulk updates: if the target was already
        // primary, mutating the loaded entity would be a no-op and Hibernate
        // would not undo the clear, leaving the car with no primary image.
        carImageRepository.clearPrimaryForCar(car);
        carImageRepository.setPrimary(image.getId(), car);

        CarImage updated = carImageRepository.findByIdAndCar(imageId, car)
                .orElseThrow(() -> new ResourceNotFoundException("Image with id " + imageId + " does not exist!"));
        return toDto(updated, carId);
    }

    public List<CarImageDto> listImages(Long carId) {
        Cars car = carRepository.findById(carId)
                .orElseThrow(() -> new ResourceNotFoundException("Car with id " + carId + " does not exist!"));
        List<CarImageDto> dtos = new ArrayList<>();
        for (CarImage img : carImageRepository.findByCarOrderBySortOrderAscIdAsc(car)) {
            dtos.add(toDto(img, carId));
        }
        return dtos;
    }

    public CarImage getImage(Long carId, Long imageId) {
        Cars car = carRepository.findById(carId)
                .orElseThrow(() -> new ResourceNotFoundException("Car with id " + carId + " does not exist!"));
        return carImageRepository.findByIdAndCar(imageId, car)
                .orElseThrow(() -> new ResourceNotFoundException("Image with id " + imageId + " does not exist!"));
    }

    public void deleteImagesForCar(Long carId) {
        Cars car = carRepository.findById(carId).orElse(null);
        if (car == null) {
            return;
        }
        List<CarImage> images = carImageRepository.findByCarOrderBySortOrderAscIdAsc(car);
        for (CarImage img : images) {
            deleteFile(carId, img.getFileName());
        }
        // rows will be removed by cascade / explicit
        carImageRepository.deleteAll(images);
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Empty file");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File exceeds 5 MB limit");
        }
        String contentType = normalizeContentType(file.getContentType());
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Unsupported image type: " + contentType);
        }

        // Magic bytes check
        try (InputStream in = file.getInputStream()) {
            byte[] header = new byte[12];
            int read = in.read(header);
            if (read < 4) {
                throw new IllegalArgumentException("Corrupted or empty image");
            }
            if (!matchesMagicBytes(header, contentType)) {
                throw new IllegalArgumentException("File content does not match declared type");
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to read image", e);
        }
    }

    private boolean matchesMagicBytes(byte[] header, String contentType) {
        switch (contentType) {
            case "image/jpeg":
                return (header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF;
            case "image/png":
                return (header[0] & 0xFF) == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47
                        && header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A;
            case "image/webp":
                return header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                        && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P';
            default:
                return false;
        }
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null) {
            return "";
        }
        return contentType.toLowerCase(Locale.ROOT).split(";")[0].trim();
    }

    private String generateSafeFileName(MultipartFile file) {
        String original = file.getOriginalFilename();
        String ext = "bin";
        if (original != null) {
            int dot = original.lastIndexOf('.');
            if (dot >= 0 && dot < original.length() - 1) {
                String candidate = original.substring(dot + 1).toLowerCase(Locale.ROOT);
                if (candidate.matches("[a-z0-9]{1,5}")) {
                    ext = candidate;
                }
            }
        }
        // Map extension by content type to be safe
        String ct = normalizeContentType(file.getContentType());
        if (ct.equals("image/jpeg")) ext = "jpg";
        else if (ct.equals("image/png")) ext = "png";
        else if (ct.equals("image/webp")) ext = "webp";

        return UUID.randomUUID().toString() + "." + ext;
    }

    private void deleteFile(Long carId, String fileName) {
        try {
            Path target = uploadRoot.resolve(String.valueOf(carId)).resolve(fileName).normalize();
            if (target.startsWith(uploadRoot)) {
                Files.deleteIfExists(target);
            }
        } catch (IOException ignored) {
        }
    }

    private void cleanupFiles(List<Path> files) {
        for (Path f : files) {
            try {
                Files.deleteIfExists(f);
            } catch (IOException ignored) {
            }
        }
    }

    public byte[] readImageBytes(Long carId, Long imageId) {
        CarImage image = getImage(carId, imageId);
        Path target = uploadRoot.resolve(String.valueOf(carId)).resolve(image.getFileName()).normalize();
        if (!target.startsWith(uploadRoot)) {
            throw new SecurityException("Invalid path");
        }
        try {
            return Files.readAllBytes(target);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read image", e);
        }
    }

    public String getImageContentType(Long carId, Long imageId) {
        return getImage(carId, imageId).getContentType();
    }

    private CarImageDto toDto(CarImage img, Long carId) {
        CarImageDto dto = new CarImageDto();
        dto.setId(img.getId());
        dto.setUrl("/api/cars/" + carId + "/images/" + img.getId());
        dto.setPrimary(img.isPrimary());
        dto.setContentType(img.getContentType());
        dto.setSizeBytes(img.getSizeBytes());
        dto.setSortOrder(img.getSortOrder());
        return dto;
    }
}
