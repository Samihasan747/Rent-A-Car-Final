package com.RentACarDemo.exceptions;

import com.RentACarDemo.exceptions.dto.ExceptionResponseDto;
import com.RentACarDemo.exceptions.dto.ValidationExceptionDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationExceptionDto> handleValidationException(
            MethodArgumentNotValidException ex,
            HttpServletRequest servReq) {

        Map<String, String> fieldErrors = new HashMap<>();

        ex.getBindingResult().getFieldErrors()
                .forEach(error ->
                        fieldErrors.put(error.getField(), error.getDefaultMessage()));

        ValidationExceptionDto validationExceptionDto = new ValidationExceptionDto(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                servReq.getRequestURI(),
                "Invalid Input",
                fieldErrors
        );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(validationExceptionDto);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ExceptionResponseDto> handleUnreadableBody(
            HttpMessageNotReadableException ex,
            HttpServletRequest servReq) {

        return error(HttpStatus.BAD_REQUEST, "Malformed request body", servReq);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ExceptionResponseDto> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex,
            HttpServletRequest servReq) {

        return error(HttpStatus.BAD_REQUEST, "Invalid request parameter", servReq);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ExceptionResponseDto> handleMissingParameter(
            MissingServletRequestParameterException ex,
            HttpServletRequest servReq) {

        return error(HttpStatus.BAD_REQUEST,
                "Missing required request parameter: " + ex.getParameterName(), servReq);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ExceptionResponseDto> handleIllegalArgument(
            IllegalArgumentException ex,
            HttpServletRequest servReq) {

        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), servReq);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ExceptionResponseDto> handleAccessDenied(
            AccessDeniedException ex,
            HttpServletRequest servReq) {

        return error(HttpStatus.FORBIDDEN,
                "You do not have permission to access this resource", servReq);
    }

    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<ExceptionResponseDto> handleInvalidRequest(
            InvalidRequestException ex,
            HttpServletRequest servReq) {

        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), servReq);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ExceptionResponseDto> handleDataIntegrityViolation(
            DataIntegrityViolationException ex,
            HttpServletRequest servReq) {

        String detail = ex.getMostSpecificCause() != null
                ? ex.getMostSpecificCause().getMessage()
                : ex.getMessage();
        String normalizedDetail = detail == null ? "" : detail.toLowerCase(Locale.ROOT);

        boolean likelyEmailConflict =
                normalizedDetail.contains("email")
                        || servReq.getRequestURI().startsWith("/api/user/");

        String message = likelyEmailConflict
                ? "Email already exists!"
                : "Request conflicts with existing data";

        return error(HttpStatus.CONFLICT, message, servReq);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ExceptionResponseDto> handleConflict(
            ConflictException ex,
            HttpServletRequest servReq) {

        return error(HttpStatus.CONFLICT, ex.getMessage(), servReq);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ExceptionResponseDto> handleResourceNotFoundException(
            ResourceNotFoundException ex,
            HttpServletRequest servReq) {

        return error(HttpStatus.NOT_FOUND, ex.getMessage(), servReq);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ExceptionResponseDto> handleAuthenticationException(
            AuthenticationException ex,
            HttpServletRequest servReq) {

        return error(HttpStatus.UNAUTHORIZED, "Invalid email or password", servReq);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ExceptionResponseDto> handleRuntimeException(
            RuntimeException ex,
            HttpServletRequest servReq) {

        return error(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), servReq);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ExceptionResponseDto> handleException(
            Exception ex,
            HttpServletRequest servReq) {

        return error(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), servReq);
    }

    private ResponseEntity<ExceptionResponseDto> error(
            HttpStatus status,
            String message,
            HttpServletRequest servReq) {

        ExceptionResponseDto exceptionResponseDto = new ExceptionResponseDto(
                LocalDateTime.now(),
                status.value(),
                status.getReasonPhrase(),
                message,
                servReq.getRequestURI()
        );

        return ResponseEntity
                .status(status)
                .body(exceptionResponseDto);
    }
}
