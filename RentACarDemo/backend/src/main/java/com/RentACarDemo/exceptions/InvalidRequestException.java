package com.RentACarDemo.exceptions;

/**
 * Raised for request-level validation failures that are not covered by
 * bean validation (for example: an invalid date range).
 * Mapped to HTTP 400 by {@link GlobalExceptionHandler}.
 */
public class InvalidRequestException extends RuntimeException {

    public InvalidRequestException(String message) {
        super(message);
    }
}
