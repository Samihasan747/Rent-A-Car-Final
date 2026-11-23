package com.RentACarDemo.security;

import com.RentACarDemo.user.User;
import com.RentACarDemo.user.UserRepository;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Resolves the authenticated user from the JWT.
 *
 * New tokens contain a stable "uid" claim, so changing the account email does
 * not break the current session. Tokens issued before this change only contain
 * the email in "sub"; they fall back to the email lookup until they expire.
 */
@Component
public class CurrentUserProvider {

    private final UserRepository userRepository;

    public CurrentUserProvider(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User require(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InsufficientAuthenticationException("Authentication required");
        }

        if (authentication.getPrincipal() instanceof Jwt jwt) {
            return findForJwt(jwt)
                    .orElseThrow(() -> new InsufficientAuthenticationException("Account is not active"));
        }

        return userRepository.findByEmailAndIsDeletedFalse(authentication.getName())
                .orElseThrow(() -> new InsufficientAuthenticationException("Account is not active"));
    }

    public Optional<User> findForJwt(Jwt jwt) {
        Long userId = asLong(jwt.getClaim("uid"));
        if (userId != null) {
            return userRepository.findByIdAndIsDeletedFalse(userId);
        }

        String email = jwt.getSubject();
        if (email == null || email.isBlank()) {
            return Optional.empty();
        }

        return userRepository.findByEmailAndIsDeletedFalse(email);
    }

    private Long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Long.valueOf(text);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
