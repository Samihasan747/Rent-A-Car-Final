package com.RentACarDemo.cars.dto;

import java.math.BigDecimal;
import java.util.List;

public class CarRespondDto {

    Long Id;
    String name;
    String model;
    Boolean isBooked;
    BigDecimal price;

    String primaryImageUrl;
    List<CarImageDto> images;

    public Long getId() {
        return Id;
    }

    public void setId(Long id) {
        Id = id;
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

    public String getPrimaryImageUrl() {
        return primaryImageUrl;
    }

    public void setPrimaryImageUrl(String primaryImageUrl) {
        this.primaryImageUrl = primaryImageUrl;
    }

    public List<CarImageDto> getImages() {
        return images;
    }

    public void setImages(List<CarImageDto> images) {
        this.images = images;
    }
}

