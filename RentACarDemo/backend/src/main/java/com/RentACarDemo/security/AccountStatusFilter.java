package com.RentACarDemo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Stateless JWTs cannot be revoked, so an account that is soft-deleted while a
 * token is still valid would otherwise keep working until the token expires.
 * This filter rejects such requests with the standard 401 JSON response.
 *
 * It is registered inside the Spring Security chain only (not as a servlet
 * filter bean) to avoid running outside the chain.
 */
public class AccountStatusFilter extends OncePerRequestFilter {

    private final CurrentUserProvider currentUserProvider;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;

    public AccountStatusFilter(
            CurrentUserProvider currentUserProvider,
            RestAuthenticationEntryPoint authenticationEntryPoint) {
        this.currentUserProvider = currentUserProvider;
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof Jwt jwt
                && currentUserProvider.findForJwt(jwt).isEmpty()) {

            SecurityContextHolder.clearContext();
            authenticationEntryPoint.commence(
                    request,
                    response,
                    new InsufficientAuthenticationException("Account is not active"));
            return;
        }

        filterChain.doFilter(request, response);
    }
}
