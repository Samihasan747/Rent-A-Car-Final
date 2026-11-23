package com.RentACarDemo;

import com.RentACarDemo.booking.BookingRepository;
import com.RentACarDemo.booking.BookingService;
import com.RentACarDemo.booking.BookingStatus;
import com.RentACarDemo.booking.dto.CreateBookingRequestDto;
import com.RentACarDemo.cars.CarRepository;
import com.RentACarDemo.cars.Cars;
import com.RentACarDemo.exceptions.ConflictException;
import com.RentACarDemo.user.Role;
import com.RentACarDemo.user.User;
import com.RentACarDemo.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Concurrency test for the pessimistic-lock guard. It deliberately does not use
 * {@code @Transactional} because the competing calls must commit in separate
 * transactions; every row it creates is removed afterwards through JDBC.
 */
@SpringBootTest
class PhaseBConcurrencyTests {

    private final List<Long> userIds = new ArrayList<>();
    private Long carId;

    @Autowired
    private BookingService bookingService;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private CarRepository carRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void reset() {
        userIds.clear();
        carId = null;
    }

    @AfterEach
    void cleanUp() {
        if (carId != null) {
            jdbcTemplate.update("UPDATE user_table SET booked_car = NULL WHERE booked_car = ?", carId);
            jdbcTemplate.update("DELETE FROM bookings WHERE car_id = ?", carId);
            jdbcTemplate.update("DELETE FROM cars_table WHERE car_id = ?", carId);
        }
        for (Long userId : userIds) {
            jdbcTemplate.update("DELETE FROM bookings WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM user_table WHERE user_id = ?", userId);
        }
        userIds.clear();
        carId = null;
    }

    @Test
    void concurrentOverlappingRequestsCreateExactlyOneBooking() throws Exception {
        Cars car = new Cars();
        car.setName("Phase B Concurrency " + UUID.randomUUID());
        car.setModel("Test Model");
        car.setBooked(false);
        car.setPrice(new BigDecimal("35.00"));
        carId = carRepository.saveAndFlush(car).getId();

        long firstUser = createUser();
        long secondUser = createUser();

        LocalDate start = LocalDate.now().plusDays(4);
        LocalDate end = start.plusDays(2);

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch fire = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);

        Callable<String> firstAttempt = () -> race(firstUser, ready, fire, start, end);
        Callable<String> secondAttempt = () -> race(secondUser, ready, fire, start, end);

        try {
            Future<String> first = pool.submit(firstAttempt);
            Future<String> second = pool.submit(secondAttempt);

            assertTrue(ready.await(10, TimeUnit.SECONDS), "Both threads should be ready");
            fire.countDown();

            List<String> outcomes = List.of(
                    first.get(30, TimeUnit.SECONDS),
                    second.get(30, TimeUnit.SECONDS));

            assertEquals(1, outcomes.stream().filter("CREATED"::equals).count(),
                    "Exactly one request must win, outcomes=" + outcomes);
            assertEquals(1, outcomes.stream().filter("CONFLICT"::equals).count(),
                    "Exactly one request must fail with a conflict, outcomes=" + outcomes);
        } finally {
            pool.shutdownNow();
        }

        long persisted = bookingRepository.findAll().stream()
                .filter(booking -> booking.getCar().getId().equals(carId))
                .filter(booking -> booking.getStatus() == BookingStatus.PENDING_PAYMENT)
                .count();
        assertEquals(1, persisted);
    }

    private String race(long userId, CountDownLatch ready, CountDownLatch fire,
                        LocalDate start, LocalDate end) throws Exception {
        ready.countDown();
        if (!fire.await(10, TimeUnit.SECONDS)) {
            throw new IllegalStateException("Start signal was not released");
        }

        CreateBookingRequestDto request = new CreateBookingRequestDto();
        request.setCarId(carId);
        request.setStartDate(start);
        request.setEndDate(end);

        try {
            bookingService.createBooking(userId, request);
            return "CREATED";
        } catch (ConflictException ex) {
            return "CONFLICT";
        }
    }

    private long createUser() {
        User user = new User();
        user.setName("Phase B Concurrency");
        user.setEmail("phaseb-concurrency-" + UUID.randomUUID() + "@example.com");
        user.setPassword("irrelevant");
        user.setRole(Role.CUSTOMER);
        user.setDeleted(false);
        long id = userRepository.saveAndFlush(user).getId();
        userIds.add(id);
        return id;
    }
}
