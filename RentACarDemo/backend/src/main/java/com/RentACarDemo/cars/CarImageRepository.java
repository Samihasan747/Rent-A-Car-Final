package com.RentACarDemo.cars;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CarImageRepository extends JpaRepository<CarImage, Long> {

    List<CarImage> findByCarOrderBySortOrderAscIdAsc(Cars car);

    Optional<CarImage> findByIdAndCar(Long id, Cars car);

    Optional<CarImage> findFirstByCarOrderBySortOrderAscIdAsc(Cars car);

    long countByCar(Cars car);

    Optional<CarImage> findByCarAndPrimaryTrue(Cars car);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update CarImage ci set ci.primary = false where ci.car = :car")
    void clearPrimaryForCar(@Param("car") Cars car);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update CarImage ci set ci.primary = true where ci.id = :id and ci.car = :car")
    int setPrimary(@Param("id") Long id, @Param("car") Cars car);
}
