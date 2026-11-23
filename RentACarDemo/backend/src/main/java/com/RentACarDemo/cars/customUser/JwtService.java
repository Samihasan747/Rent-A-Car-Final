package com.RentACarDemo.cars.customUser;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class JwtService {

    @Autowired
    private JwtEncoder jwtEncoder;

    @Value("${jwt.issuer}")
    private String issuer;

    @Value("${jwt.expiry}")
    private Long expiry;

    /**
     * Kept for callers that do not have the user id available. Tokens created
     * through this overload can only be resolved by the email in the subject.
     */
    public String generateToken(Authentication authentication) {
        return generateToken(authentication, null);
    }

    /**
     * Creates a token with a stable "uid" claim so that changing the account
     * email does not invalidate the current session.
     */
    public String generateToken(Authentication authentication, Long userId) {
        Instant now = Instant.now();

        List<String> authorities =
                authentication.getAuthorities()
                        .stream()
                        .map(GrantedAuthority::getAuthority)
                        .toList();

        JwtClaimsSet.Builder claimsBuilder = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(
                        now.plusSeconds(expiry)
                )
                .subject(
                        authentication.getName()
                )
                .claim(
                        "authorities",
                        authorities
                );

        if (userId != null) {
            claimsBuilder.claim("uid", userId);
        }

        Jwt jwt = jwtEncoder.encode(
                JwtEncoderParameters.from(claimsBuilder.build())
        );

        return jwt.getTokenValue();
    }
}