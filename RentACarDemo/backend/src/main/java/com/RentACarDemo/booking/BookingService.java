package com.RentACarDemo.booking;

import com.RentACarDemo.booking.dto.BookingResponseDto;
import com.RentACarDemo.booking.dto.CreateBookingRequestDto;
import com.RentACarDemo.cars.CarRepository;
import com.RentACarDemo.cars.Cars;
import com.RentACarDemo.exceptions.ConflictException;
import com.RentACarDemo.exceptions.InvalidRequestException;
import com.RentACarDemo.exceptions.ResourceNotFoundException;
import com.RentACarDemo.user.User;
import com.RentACarDemo.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Reservation service. {@code bookings} is the authoritative store; the legacy
 * {@code user_table.booked_car} and {@code cars_table.is_booked} columns are
 * mirrors that are refreshed after every state change.
 *
 * <p>Date ranges are inclusive on both ends: 2026-12-01 → 2026-12-05 is 5 days.
 * A maximum of 30 calendar days is allowed per rental.</p>
 */
@Service
public class BookingService {

    public static final int MAX_RENTAL_DAYS = 30;

    private final BookingRepository bookingRepository;
    private final CarRepository carRepository;
    private final UserRepository userRepository;

    @Value("${app.booking.payment-expiry-minutes:15}")
    private int paymentExpiryMinutes;

    public BookingService(
            BookingRepository bookingRepository,
            CarRepository carRepository,
            UserRepository userRepository) {
        this.bookingRepository = bookingRepository;
        this.carRepository = carRepository;
        this.userRepository = userRepository;
    }

    // ------------------------------------------------------------- create ---

    /**
     * Creates a dated reservation. Any number of non-overlapping future
     * reservations is allowed for the same customer.
     */
    @Transactional
    public BookingResponseDto createBooking(Long userId, CreateBookingRequestDto request) {
        validateRentalRange(request.getStartDate(), request.getEndDate(), true);
        return createInternal(userId, request.getCarId(), request.getStartDate(), request.getEndDate());
    }

    /**
     * Backwards-compatible single-day booking used by {@code POST /api/user/book/{cid}}.
     * Starting today keeps the legacy semantics ("book this car now") while all
     * rules and persistence go through the booking service.
     */
    @Transactional
    public BookingResponseDto createLegacyBooking(Long userId, Long carId) {
        LocalDate today = LocalDate.now();

        boolean hasCurrentBooking = bookingRepository
                .findFirstByUserIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByStartDateAsc(
                        userId, BookingStatus.CONFIRMED, today, today)
                .isPresent()
            || bookingRepository
                .findFirstByUserIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByStartDateAsc(
                        userId, BookingStatus.PENDING_PAYMENT, today, today)
                .isPresent();
        if (hasCurrentBooking) {
            throw new ConflictException("User already has a booking");
        }

        return createInternal(userId, carId, today, today);
    }

    private BookingResponseDto createInternal(Long userId, Long carId, LocalDate startDate, LocalDate endDate) {
        // Lock the car first...
        Cars car = carRepository.findByIdForUpdate(carId)
                .orElseThrow(() -> new ResourceNotFoundException("Car with id " + carId + " does not exist"));

        User user = userRepository.findByIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (bookingRepository.existsActiveOverlap(carId, startDate, endDate,
                Instant.now().minus(paymentExpiryMinutes, java.time.temporal.ChronoUnit.MINUTES))) {
            throw new ConflictException("Car is not available for the selected dates");
        }

        long days = rentalDays(startDate, endDate);
        BigDecimal totalPrice = car.getPrice()
                .multiply(BigDecimal.valueOf(days))
                .setScale(2, RoundingMode.HALF_UP);

        Booking booking = new Booking();
        booking.setUser(user);
        booking.setCar(car);
        booking.setStartDate(startDate);
        booking.setEndDate(endDate);
        booking.setDailyPrice(car.getPrice());
        booking.setTotalPrice(totalPrice);
        booking.setStatus(BookingStatus.PENDING_PAYMENT);
        booking.setCreatedAt(Instant.now());

        bookingRepository.save(booking);
        syncMirrors(booking, LocalDate.now());

        return mapToDto(booking);
    }

    // ------------------------------------------------------------- cancel ---

    /**
     * Cancels a reservation. Customers may only cancel reservations that have
     * not started yet and only their own; administrators may cancel any
     * confirmed reservation. Cancelled rows never block dates again.
     */
    @Transactional
    public BookingResponseDto cancelBooking(Long userId, Long bookingId, boolean admin) {
        Booking booking = (admin
                ? bookingRepository.findById(bookingId)
                : bookingRepository.findByIdAndUserId(bookingId, userId))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Booking with id " + bookingId + " does not exist"));

        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new ConflictException("Only pending or confirmed bookings can be cancelled");
        }

        LocalDate today = LocalDate.now();
        if (!admin && !booking.getStartDate().isAfter(today)) {
            throw new ConflictException(
                    "This rental has already started; contact an administrator to cancel it");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(Instant.now());
        bookingRepository.save(booking);
        syncMirrors(booking, today);

        return mapToDto(booking);
    }

    /**
     * Legacy {@code POST /api/user/cancel}: cancels the caller's current
     * reservation. This preserves the old endpoint's immediate-cancel behaviour;
     * it is intentionally not subject to the "must not have started" rule, which
     * would make same-day legacy bookings impossible to cancel.
     */
    @Transactional
    public BookingResponseDto cancelCurrentBooking(Long userId) {
        LocalDate today = LocalDate.now();

        Booking booking = bookingRepository
                .findFirstByUserIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByStartDateAsc(
                        userId, BookingStatus.CONFIRMED, today, today)
                .orElseGet(() -> bookingRepository
                        .findFirstByUserIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByStartDateAsc(
                                userId, BookingStatus.PENDING_PAYMENT, today, today)
                        .orElseThrow(() -> new ConflictException("No active booking to cancel")));

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(Instant.now());
        bookingRepository.save(booking);
        syncMirrors(booking, today);

        return mapToDto(booking);
    }

    /** Cancels every confirmed reservation of a user (used when an account is deleted). */
    @Transactional
    public int cancelAllForUser(Long userId) {
        List<Booking> bookings = bookingRepository.findByUserIdOrderByStartDateDescIdDesc(userId).stream()
                .filter(booking -> booking.getStatus() == BookingStatus.CONFIRMED
                        || booking.getStatus() == BookingStatus.PENDING_PAYMENT)
                .toList();

        LocalDate today = LocalDate.now();
        for (Booking booking : bookings) {
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setCancelledAt(Instant.now());
            bookingRepository.save(booking);
            syncMirrors(booking, today);
        }
        return bookings.size();
    }

    /**
     * Deletion guard for cars. A car with confirmed reservations cannot be
     * deleted; historical (cancelled/completed) rows are removed together with
     * the car, and any stale legacy mirror is cleared first.
     */
    @Transactional
    public void prepareCarDeletion(Long carId) {
        if (bookingRepository.existsByCarIdAndStatus(carId, BookingStatus.CONFIRMED)
                || bookingRepository.existsByCarIdAndStatus(carId, BookingStatus.PENDING_PAYMENT)) {
            throw new ConflictException("Car has active bookings and cannot be deleted");
        }

        bookingRepository.deleteByCarId(carId);
        userRepository.clearBookedCarMirror(carId);
    }

    // --------------------------------------------------------------- read ---
    @Transactional
    public List<BookingResponseDto> getBookingsForUser(Long userId) {
        expirePending(LocalDate.now());
        completeExpired(LocalDate.now());
        return bookingRepository.findByUserIdOrderByStartDateDescIdDesc(userId).stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional
    public List<BookingResponseDto> getAllBookings(BookingStatus status) {
        expirePending(LocalDate.now());
        completeExpired(LocalDate.now());
        List<Booking> bookings = status == null
                ? bookingRepository.findAllByOrderByStartDateDescIdDesc()
                : bookingRepository.findByStatusOrderByStartDateDescIdDesc(status);
        return bookings.stream().map(this::mapToDto).toList();
    }

    @Transactional
    public boolean isCarAvailable(Long carId, LocalDate startDate, LocalDate endDate) {
        validateAvailabilityRange(startDate, endDate);
        carRepository.findById(carId)
                .orElseThrow(() -> new ResourceNotFoundException("Car with id " + carId + " does not exist"));
        expirePending(LocalDate.now());
        completeExpired(LocalDate.now());
        return !bookingRepository.existsActiveOverlap(carId, startDate, endDate,
                Instant.now().minus(paymentExpiryMinutes, java.time.temporal.ChronoUnit.MINUTES));
    }

    @Transactional
    public List<Cars> findAvailableCars(LocalDate startDate, LocalDate endDate) {
        validateAvailabilityRange(startDate, endDate);
        expirePending(LocalDate.now());
        completeExpired(LocalDate.now());

        Set<Long> unavailable = new HashSet<>(
                bookingRepository.findActiveUnavailableCarIds(startDate, endDate,
                        Instant.now().minus(paymentExpiryMinutes, java.time.temporal.ChronoUnit.MINUTES)));

        return carRepository.findAll().stream()
                .filter(car -> !unavailable.contains(car.getId()))
                .toList();
    }

    // ------------------------------------------------------------- mirrors ---

    /** Refreshes the legacy mirrors for every car (used by the legacy endpoints). */
    @Transactional
    public void syncAllCarMirrors() {
        LocalDate today = LocalDate.now();
        Set<Long> bookedToday = new HashSet<>(
                bookingRepository.findActiveUnavailableCarIds(today, today,
                        Instant.now().minus(paymentExpiryMinutes, java.time.temporal.ChronoUnit.MINUTES)));

        for (Cars car : carRepository.findAll()) {
            Boolean booked = bookedToday.contains(car.getId());
            if (!booked.equals(car.getBooked())) {
                car.setBooked(booked);
            }
        }
    }

    /**
     * Refreshes the legacy {@code user_table.booked_car} mirror. It points at the
     * car the user is renting <em>today</em>, or is {@code null}. The column has a
     * unique constraint, so future reservations are deliberately not mirrored:
     * several customers may book the same car on different future dates.
     */
    @Transactional
    public void syncUserMirror(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return;
        }

        LocalDate today = LocalDate.now();
        Cars currentCar = bookingRepository
                .findFirstByUserIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByStartDateAsc(
                        userId, BookingStatus.CONFIRMED, today, today)
                .map(Booking::getCar)
                .orElseGet(() -> bookingRepository
                        .findFirstByUserIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByStartDateAsc(
                                userId, BookingStatus.PENDING_PAYMENT, today, today)
                        .map(Booking::getCar)
                        .orElse(null));

        user.setBookedCar(currentCar);
        userRepository.save(user);
    }

    private void syncMirrors(Booking booking, LocalDate today) {
        // Resolve identifiers first: the reservations may reference lazily loaded
        // entities, and the legacy mirrors only need the ids.
        Long carId = booking.getCar().getId();
        Long userId = booking.getUser().getId();

        Cars car = carRepository.findById(carId).orElse(null);
        if (car != null) {
            car.setBooked(bookingRepository.existsActiveOverlap(carId, today, today,
                    Instant.now().minus(paymentExpiryMinutes, java.time.temporal.ChronoUnit.MINUTES)));
        }

        syncUserMirror(userId);
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void expirePendingScheduled() {
        expirePending(LocalDate.now());
    }

    private void expirePending(LocalDate today) {
        bookingRepository.expirePendingBookings(Instant.now().minus(paymentExpiryMinutes, java.time.temporal.ChronoUnit.MINUTES));
    }

    private void completeExpired(LocalDate today) {
        bookingRepository.completeExpiredBookings(today);
    }

    // ---------------------------------------------------------- validation ---

    private void validateRentalRange(LocalDate startDate, LocalDate endDate, boolean rejectPast) {
        validateAvailabilityRange(startDate, endDate);

        if (rejectPast && startDate.isBefore(LocalDate.now())) {
            throw new InvalidRequestException("startDate cannot be in the past");
        }
        if (rentalDays(startDate, endDate) > MAX_RENTAL_DAYS) {
            throw new InvalidRequestException("A rental cannot exceed " + MAX_RENTAL_DAYS + " days");
        }
    }

    private void validateAvailabilityRange(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new InvalidRequestException("Both startDate and endDate are required");
        }
        if (endDate.isBefore(startDate)) {
            throw new InvalidRequestException("endDate must be on or after startDate");
        }
    }

    public static long rentalDays(LocalDate startDate, LocalDate endDate) {
        return ChronoUnit.DAYS.between(startDate, endDate) + 1;
    }

    // --------------------------------------------------------------- DTO ---

    private BookingResponseDto mapToDto(Booking booking) {
        Cars car = booking.getCar();
        User user = booking.getUser();
        return new BookingResponseDto(
                booking.getId(),
                user.getId(),
                user.getName(),
                user.getEmail(),
                car.getId(),
                car.getName(),
                car.getModel(),
                booking.getStartDate(),
                booking.getEndDate(),
                rentalDays(booking.getStartDate(), booking.getEndDate()),
                booking.getDailyPrice(),
                booking.getTotalPrice(),
                booking.getStatus(),
                booking.getCreatedAt(),
                booking.getCancelledAt()
        );
    }
}
