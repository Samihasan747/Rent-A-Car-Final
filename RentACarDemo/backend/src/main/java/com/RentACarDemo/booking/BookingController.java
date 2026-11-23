package com.RentACarDemo.booking;

import com.RentACarDemo.booking.dto.BookingResponseDto;
import com.RentACarDemo.booking.dto.CreateBookingRequestDto;
import com.RentACarDemo.security.CurrentUserProvider;
import com.RentACarDemo.user.Role;
import com.RentACarDemo.user.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;
    private final CurrentUserProvider currentUserProvider;

    public BookingController(BookingService bookingService, CurrentUserProvider currentUserProvider) {
        this.bookingService = bookingService;
        this.currentUserProvider = currentUserProvider;
    }

    @PostMapping
    public ResponseEntity<BookingResponseDto> createBooking(
            @Valid @RequestBody CreateBookingRequestDto request,
            Authentication authentication) {

        User user = currentUserProvider.require(authentication);
        BookingResponseDto booking = bookingService.createBooking(user.getId(), request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(booking);
    }

    @GetMapping("/me")
    public ResponseEntity<List<BookingResponseDto>> getMyBookings(Authentication authentication) {
        User user = currentUserProvider.require(authentication);
        return ResponseEntity.ok(bookingService.getBookingsForUser(user.getId()));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<BookingResponseDto> cancelBooking(
            @PathVariable Long id,
            Authentication authentication) {

        User user = currentUserProvider.require(authentication);
        boolean admin = user.getRole() == Role.ADMIN;

        return ResponseEntity.ok(bookingService.cancelBooking(user.getId(), id, admin));
    }
}
