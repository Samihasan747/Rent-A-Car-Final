package com.RentACarDemo.exceptions;

/**
 * Raised when a request is valid but conflicts with current state
 * (for example: car unavailable, duplicate email, no active booking).
 * Mapped to HTTP 409 by {@link GlobalExceptionHandler}.
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
