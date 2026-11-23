package com.RentACarDemo.booking;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByUserIdOrderByStartDateDescIdDesc(Long userId);

    List<Booking> findByStatusOrderByStartDateDescIdDesc(BookingStatus status);

    List<Booking> findAllByOrderByStartDateDescIdDesc();

    Optional<Booking> findByIdAndUserId(Long id, Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);

    /**
     * Inclusive overlap test: two ranges conflict when each starts on or before
     * the other ends.
     */
    @Query("""
            select count(b) > 0
            from Booking b
            where b.car.id = :carId
              and b.status = :status
              and b.startDate <= :endDate
              and b.endDate >= :startDate
            """)
    boolean existsOverlap(
            @Param("carId") Long carId,
            @Param("status") BookingStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("""
            select distinct b.car.id
            from Booking b
            where b.status = :status
              and b.startDate <= :endDate
              and b.endDate >= :startDate
            """)
    List<Long> findUnavailableCarIds(
            @Param("status") BookingStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("""
            select distinct b.car.id
            from Booking b
            where (b.status = com.RentACarDemo.booking.BookingStatus.CONFIRMED
                   or (b.status = com.RentACarDemo.booking.BookingStatus.PENDING_PAYMENT
                       and b.createdAt > :expiryCutoff))
              and b.startDate <= :endDate
              and b.endDate >= :startDate
            """)
    List<Long> findActiveUnavailableCarIds(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("expiryCutoff") Instant expiryCutoff);

    /**
     * Active reservations block a car's dates: confirmed bookings always,
     * and pending-payment bookings only while their payment window is open.
     */
    @Query("""
            select count(b) > 0
            from Booking b
            where b.car.id = :carId
              and (
                    b.status = com.RentACarDemo.booking.BookingStatus.CONFIRMED
                    or (b.status = com.RentACarDemo.booking.BookingStatus.PENDING_PAYMENT
                        and b.createdAt > :expiryCutoff)
                  )
              and b.startDate <= :endDate
              and b.endDate >= :startDate
            """)
    boolean existsActiveOverlap(
            @Param("carId") Long carId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("expiryCutoff") Instant expiryCutoff);

    @Modifying(flushAutomatically = true)
    @Query("""
            update Booking b
            set b.status = com.RentACarDemo.booking.BookingStatus.EXPIRED
            where b.status = com.RentACarDemo.booking.BookingStatus.PENDING_PAYMENT
              and b.createdAt < :cutoff
            """)
    int expirePendingBookings(@Param("cutoff") Instant cutoff);

    Optional<Booking> findFirstByUserIdAndStatusOrderByStartDateAsc(Long userId, BookingStatus status);

    boolean existsByCarIdAndStatus(Long carId, BookingStatus status);

    long countByCarId(Long carId);

    Optional<Booking> findFirstByUserIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByStartDateAsc(
            Long userId, BookingStatus status, LocalDate day, LocalDate sameDay);

    void deleteByCarId(Long carId);

    @Modifying(flushAutomatically = true)
    @Query("""
            update Booking b
            set b.status = com.RentACarDemo.booking.BookingStatus.COMPLETED
            where b.status = com.RentACarDemo.booking.BookingStatus.CONFIRMED
              and b.endDate < :today
            """)
    int completeExpiredBookings(@Param("today") LocalDate today);
}
