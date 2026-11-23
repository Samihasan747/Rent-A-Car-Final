package com.RentACarDemo.booking;

import com.RentACarDemo.booking.dto.BookingResponseDto;
import com.RentACarDemo.security.CurrentUserProvider;
import com.RentACarDemo.user.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Admin booking management. The whole {@code /api/admin/**} tree is restricted
 * to {@code ROLE_ADMIN} in {@code SecurityConfig}.
 */
@RestController
@RequestMapping("/api/admin/bookings")
public class AdminBookingController {

    private final BookingService bookingService;
    private final CurrentUserProvider currentUserProvider;

    public AdminBookingController(BookingService bookingService, CurrentUserProvider currentUserProvider) {
        this.bookingService = bookingService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    public ResponseEntity<List<BookingResponseDto>> getAllBookings(
            @RequestParam(required = false) BookingStatus status) {

        return ResponseEntity.ok(bookingService.getAllBookings(status));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<BookingResponseDto> cancelBooking(
            @PathVariable Long id,
            Authentication authentication) {

        User admin = currentUserProvider.require(authentication);
        return ResponseEntity.ok(bookingService.cancelBooking(admin.getId(), id, true));
    }
}
