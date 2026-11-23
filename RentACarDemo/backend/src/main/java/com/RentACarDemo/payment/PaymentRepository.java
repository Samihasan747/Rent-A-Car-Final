package com.RentACarDemo.payment;

import com.RentACarDemo.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByTranId(String tranId);
    List<Payment> findByBookingIdOrderByInitiatedAtDesc(Long bookingId);
    List<Payment> findByBooking_User_IdOrderByInitiatedAtDesc(Long userId);
    boolean existsByTranId(String tranId);
    Optional<Payment> findFirstByBookingIdAndStatusOrderByInitiatedAtDesc(Long bookingId, PaymentStatus status);
}