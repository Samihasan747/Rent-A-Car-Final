package com.RentACarDemo;

import com.RentACarDemo.booking.Booking;
import com.RentACarDemo.booking.BookingRepository;
import com.RentACarDemo.booking.BookingService;
import com.RentACarDemo.booking.BookingStatus;
import com.RentACarDemo.cars.CarRepository;
import com.RentACarDemo.cars.Cars;
import com.RentACarDemo.user.Role;
import com.RentACarDemo.user.User;
import com.RentACarDemo.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase B tests: bookings are authoritative, dates are inclusive, legacy
 * mirrors stay in sync and every endpoint keeps its previous behaviour.
 *
 * <p>The class is transactional, so nothing it creates survives the test run.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PhaseBIntegrationTests {

    private static final String PASSWORD = "Password123";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CarRepository carRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void bookingUsesInclusiveDaysAndSnapshotsTheDailyPrice() throws Exception {
        Cars car = createCar(new BigDecimal("49.99"));
        String token = login(createUser(Role.CUSTOMER));

        LocalDate start = LocalDate.now().plusDays(10);
        LocalDate end = start.plusDays(4); // 5 inclusive days

        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingBody(car.getId(), start, end)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.days").value(5))
                .andExpect(jsonPath("$.dailyPrice").value(49.99))
                .andExpect(jsonPath("$.totalPrice").value(249.95))
                .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"));

        List<Booking> bookings = activeBookingsFor(car.getId());
        assertEquals(1, bookings.size());
        assertEquals(0, new BigDecimal("249.95").compareTo(bookings.get(0).getTotalPrice()));
    }

    @Test
    void overlappingBookingIsRejectedButAdjacentRangesAreAllowed() throws Exception {
        Cars car = createCar(new BigDecimal("30.00"));
        String firstToken = login(createUser(Role.CUSTOMER));
        String secondToken = login(createUser(Role.CUSTOMER));

        LocalDate start = LocalDate.now().plusDays(5);

        book(firstToken, car.getId(), start, start.plusDays(2), 201);
        // Every possible overlap, including a single shared day.
        book(secondToken, car.getId(), start, start, 409);
        book(secondToken, car.getId(), start.plusDays(1), start.plusDays(3), 409);
        book(secondToken, car.getId(), start.minusDays(2), start.plusDays(5), 409);

        // Adjacent ranges do not overlap.
        book(secondToken, car.getId(), start.plusDays(3), start.plusDays(4), 201);
        // The same customer may hold several non-overlapping future rentals.
        book(firstToken, car.getId(), start.plusDays(10), start.plusDays(12), 201);

        assertEquals(3, activeBookingsFor(car.getId()).size());
    }

    @Test
    void dateAwareAvailabilityIgnoresTheLegacyMirror() throws Exception {
        Cars car = createCar(new BigDecimal("20.00"));
        String ownerToken = login(createUser(Role.CUSTOMER));
        String observerToken = login(createUser(Role.CUSTOMER));

        LocalDate start = LocalDate.now().plusDays(6);
        LocalDate end = start.plusDays(1);
        book(ownerToken, car.getId(), start, end, 201);

        // Legacy mirror means "rented today"; a future booking must not set it.
        Cars reloaded = carRepository.findById(car.getId()).orElseThrow();
        assertFalse(Boolean.TRUE.equals(reloaded.getBooked()));

        mockMvc.perform(get("/api/cars/available")
                        .header("Authorization", "Bearer " + observerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].Id", hasItem(car.getId().intValue())));

        mockMvc.perform(get("/api/cars/available")
                        .header("Authorization", "Bearer " + observerToken)
                        .param("startDate", start.toString())
                        .param("endDate", end.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].Id", not(hasItem(car.getId().intValue()))));

        mockMvc.perform(get("/api/cars/available")
                        .header("Authorization", "Bearer " + observerToken)
                        .param("startDate", end.plusDays(1).toString())
                        .param("endDate", end.plusDays(2).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].Id", hasItem(car.getId().intValue())));

        mockMvc.perform(get("/api/cars/{id}/availability", car.getId())
                        .header("Authorization", "Bearer " + observerToken)
                        .param("startDate", start.toString())
                        .param("endDate", start.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false));

        mockMvc.perform(get("/api/cars/{id}/availability", car.getId())
                        .header("Authorization", "Bearer " + observerToken)
                        .param("startDate", end.plusDays(1).toString())
                        .param("endDate", end.plusDays(1).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true));
    }

    @Test
    void invalidRentalRangesAreRejected() throws Exception {
        Cars car = createCar(new BigDecimal("25.00"));
        String token = login(createUser(Role.CUSTOMER));
        LocalDate today = LocalDate.now();

        book(token, car.getId(), today.plusDays(5), today.plusDays(4), 400);
        book(token, car.getId(), today.minusDays(1), today.plusDays(1), 400);
        book(token, car.getId(), today, today.plusDays(BookingService.MAX_RENTAL_DAYS), 400);
        book(token, car.getId(), today, today.plusDays(BookingService.MAX_RENTAL_DAYS - 1), 201);

        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"startDate\":\"" + today + "\",\"endDate\":\"" + today + "\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"carId\":" + car.getId() + ",\"endDate\":\"" + today + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void cancelRulesDistinguishOwnerCustomerAndAdministrator() throws Exception {
        Cars car = createCar(new BigDecimal("40.00"));
        String ownerEmail = createUser(Role.CUSTOMER);
        String ownerToken = login(ownerEmail);
        String otherToken = login(createUser(Role.CUSTOMER));
        String adminToken = login(createUser(Role.ADMIN));

        LocalDate start = LocalDate.now().plusDays(20);
        long bookingId = book(ownerToken, car.getId(), start, start.plusDays(1), 201);
        long startedBookingId = book(ownerToken, car.getId(), LocalDate.now(), LocalDate.now(), 201);

        // Another customer cannot even see someone else's booking.
        mockMvc.perform(post("/api/bookings/{id}/cancel", bookingId)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());

        // A rental that already started is only cancellable by an administrator.
        mockMvc.perform(post("/api/bookings/{id}/cancel", startedBookingId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/api/bookings/{id}/cancel", startedBookingId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        mockMvc.perform(post("/api/bookings/{id}/cancel", bookingId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        // Cancelled dates are released again.
        mockMvc.perform(get("/api/cars/{id}/availability", car.getId())
                        .header("Authorization", "Bearer " + otherToken)
                        .param("startDate", start.toString())
                        .param("endDate", start.plusDays(1).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true));

        mockMvc.perform(post("/api/bookings/{id}/cancel", bookingId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isConflict());
    }

    @Test
    void legacyBookingEndpointsStillWorkAndKeepMirrorsInSync() throws Exception {
        Cars car = createCar(new BigDecimal("15.00"));
        Cars secondCar = createCar(new BigDecimal("16.00"));
        String email = createUser(Role.CUSTOMER);
        String token = login(email);

        mockMvc.perform(post("/api/user/book/{cid}", car.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().string("Done"));

        List<Booking> bookings = activeBookingsFor(car.getId());
        assertEquals(1, bookings.size());
        assertEquals(LocalDate.now(), bookings.get(0).getStartDate());
        assertEquals(LocalDate.now(), bookings.get(0).getEndDate());

        assertTrue(Boolean.TRUE.equals(carRepository.findById(car.getId()).orElseThrow().getBooked()));

        mockMvc.perform(get("/api/user/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookedCar.id").value(car.getId()));

        // The legacy endpoint keeps its one-booking-at-a-time rule.
        mockMvc.perform(post("/api/user/book/{cid}", secondCar.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/api/user/cancel")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().string("Booking Canceled"));

        assertEquals(BookingStatus.CANCELLED, confirmedOrCancelledBooking(car.getId()).getStatus());
        assertFalse(Boolean.TRUE.equals(carRepository.findById(car.getId()).orElseThrow().getBooked()));

        mockMvc.perform(get("/api/user/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookedCar").doesNotExist());
    }

    @Test
    void legacyBookingIsRejectedWhenTheCarIsAlreadyRentedToday() throws Exception {
        Cars car = createCar(new BigDecimal("18.00"));
        String firstToken = login(createUser(Role.CUSTOMER));
        String secondToken = login(createUser(Role.CUSTOMER));

        mockMvc.perform(post("/api/user/book/{cid}", car.getId())
                        .header("Authorization", "Bearer " + firstToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/user/book/{cid}", car.getId())
                        .header("Authorization", "Bearer " + secondToken))
                .andExpect(status().isConflict());
    }

    @Test
    void administrativeDeletionGuardsAndSoftDeletesWork() throws Exception {
        Cars car = createCar(new BigDecimal("22.00"));
        String customerEmail = createUser(Role.CUSTOMER);
        String customerToken = login(customerEmail);
        String adminToken = login(createUser(Role.ADMIN));

        long bookingId = book(customerToken, car.getId(), LocalDate.now().plusDays(3),
                LocalDate.now().plusDays(4), 201);

        // A car with an active reservation cannot be deleted...
        mockMvc.perform(delete("/api/admin/cars/{id}", car.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isConflict());

        // ...but a historical (cancelled) booking does not block deletion.
        mockMvc.perform(post("/api/admin/bookings/{id}/cancel", bookingId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/admin/cars/{id}", car.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        // Deleting a customer is a soft delete that releases active bookings.
        Cars otherCar = createCar(new BigDecimal("23.00"));
        long otherBookingId = book(customerToken, otherCar.getId(),
                LocalDate.now().plusDays(7), LocalDate.now().plusDays(8), 201);

        mockMvc.perform(delete("/api/admin/user/{id}", userRepository.findByEmail(customerEmail).orElseThrow().getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        User deleted = userRepository.findByEmail(customerEmail).orElseThrow();
        assertTrue(deleted.getDeleted());
        assertNull(deleted.getBookedCar());
        assertEquals(BookingStatus.CANCELLED,
                bookingRepository.findById(otherBookingId).orElseThrow().getStatus());

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(customerEmail, PASSWORD)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminCanListBookingsAndCustomersCannot() throws Exception {
        Cars car = createCar(new BigDecimal("19.00"));
        String customerToken = login(createUser(Role.CUSTOMER));
        String adminToken = login(createUser(Role.ADMIN));

        long bookingId = book(customerToken, car.getId(), LocalDate.now().plusDays(2),
                LocalDate.now().plusDays(2), 201);

        mockMvc.perform(get("/api/admin/bookings")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem((int) bookingId)));

        mockMvc.perform(get("/api/admin/bookings")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/bookings/me")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem((int) bookingId)));

        mockMvc.perform(get("/api/admin/bookings")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("status", "PENDING_PAYMENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem((int) bookingId)));
    }

    // ------------------------------------------------------------- helpers ---

    private Cars createCar(BigDecimal price) {
        Cars car = new Cars();
        car.setName("Phase B Test " + UUID.randomUUID());
        car.setModel("Test Model");
        car.setBooked(false);
        car.setPrice(price);
        return carRepository.saveAndFlush(car);
    }

    private String createUser(Role role) {
        String email = "phaseb-" + UUID.randomUUID() + "@example.com";
        User user = new User();
        user.setName("Phase B Test");
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(PASSWORD));
        user.setRole(role);
        user.setDeleted(false);
        userRepository.saveAndFlush(user);
        return email;
    }

    private String login(String email) throws Exception {
        String response = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        Matcher matcher = Pattern.compile("\"accessToken\":\"([^\"]+)\"").matcher(response);
        assertTrue(matcher.find(), "Login response did not contain an access token");
        return matcher.group(1);
    }

    private long book(String token, Long carId, LocalDate start, LocalDate end, int expectedStatus)
            throws Exception {

        String response = mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingBody(carId, start, end)))
                .andExpect(status().is(expectedStatus))
                .andReturn()
                .getResponse()
                .getContentAsString();

        if (expectedStatus != 201) {
            return -1;
        }

        Matcher matcher = Pattern.compile("\"id\":(\\d+)").matcher(response);
        assertTrue(matcher.find(), "Booking response did not contain an id");
        return Long.parseLong(matcher.group(1));
    }

    private List<Booking> activeBookingsFor(Long carId) {
        return bookingRepository.findAll().stream()
                .filter(booking -> booking.getCar().getId().equals(carId))
                .filter(booking -> booking.getStatus() == BookingStatus.PENDING_PAYMENT
                        || booking.getStatus() == BookingStatus.CONFIRMED)
                .toList();
    }

    private Booking confirmedOrCancelledBooking(Long carId) {
        List<Booking> bookings = bookingRepository.findAll().stream()
                .filter(booking -> booking.getCar().getId().equals(carId))
                .toList();
        assertEquals(1, bookings.size());
        Booking booking = bookings.get(0);
        assertNotNull(booking);
        return booking;
    }

    private String bookingBody(Long carId, LocalDate start, LocalDate end) {
        return "{\"carId\":" + carId + ",\"startDate\":\"" + start + "\",\"endDate\":\"" + end + "\"}";
    }

    private String loginBody(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

}
