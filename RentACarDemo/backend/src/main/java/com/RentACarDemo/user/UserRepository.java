package com.RentACarDemo.user;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByIdAndIsDeletedFalse(Long id);

    List<User> findByIsDeletedFalse();
//    @EntityGraph(attributePaths = "roles")
    Optional<User> findByEmail(String email);

    Optional<User> findByEmailAndIsDeletedFalse(String email);

    boolean existsByEmail(String email);

    boolean existsByEmailAndIdNot(String email, Long id);

    /**
     * Clears legacy mirror rows that still point at a car being deleted.
     * The authoritative booking rows are handled by the booking service.
     */
    @Modifying(flushAutomatically = true)
    @Query("update User u set u.bookedCar = null where u.bookedCar.id = :carId")
    int clearBookedCarMirror(@Param("carId") Long carId);
}
