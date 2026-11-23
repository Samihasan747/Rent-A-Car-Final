package com.RentACarDemo.exceptions.dto;

import java.time.LocalDateTime;

public class ExceptionResponseDto {

    private LocalDateTime timespan;
    private int statusCode;
    private String error;
    private String message;
    private String path;

    public ExceptionResponseDto(LocalDateTime timespan, int statusCode, String error, String message, String path) {
        this.timespan = timespan;
        this.statusCode = statusCode;
        this.error = error;
        this.message = message;
        this.path = path;
    }

    public LocalDateTime getTimespan() {
        return timespan;
    }

    public void setTimespan(LocalDateTime timespan) {
        this.timespan = timespan;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public void setStatusCode(int statusCode) {
        this.statusCode = statusCode;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }
}