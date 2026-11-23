package com.RentACarDemo.cars;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CarRepository extends JpaRepository<Cars, Long> {

    List<Cars> findByIsBookedFalse();

    Optional<Cars> findByIdAndIsBookedFalse(Long id);

    Optional<Object> findByIdAndIsBookedTrue(Long cid);

    /**
     * Locks the car row for the duration of the transaction. Booking creation uses
     * this to serialise concurrent requests for the same car, which is what makes
     * the overlap check race-free.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Cars c where c.id = :id")
    Optional<Cars> findByIdForUpdate(@Param("id") Long id);
}
