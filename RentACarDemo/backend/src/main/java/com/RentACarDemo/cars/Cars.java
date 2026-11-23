package com.RentACarDemo.cars;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "cars_table")
public class Cars {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="car_id")
    private Long id;
    private String name;
    private String model;
    private Boolean isBooked;

    /** Daily rental price. Stored as DECIMAL(12,2); never use floating point for money. */
    @Column(name = "price", nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Boolean getBooked() {
        return isBooked;
    }

    public void setBooked(Boolean booked) {
        isBooked = booked;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }
}
