package com.RentACarDemo;

import com.RentACarDemo.user.Role;
import com.RentACarDemo.user.User;
import com.RentACarDemo.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PhasePaymentTests {

    private static final String PASSWORD = "Password123";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private String createUser(Role role) throws Exception {
        String email = "phasepay-" + UUID.randomUUID() + "@example.com";
        User user = new User();
        user.setName("Phase Pay Test");
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(PASSWORD));
        user.setRole(role);
        user.setDeleted(false);
        userRepository.saveAndFlush(user);
        return email;
    }

    private String login(String email) throws Exception {
        String response = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"accessToken\":\"([^\"]+)\"").matcher(response);
        org.junit.jupiter.api.Assertions.assertTrue(m.find());
        return m.group(1);
    }

    @Test
    void paymentInitiationRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/payments/initiate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingId\":1}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminPaymentsRequiresAdmin() throws Exception {
        String customerToken = login(createUser(Role.CUSTOMER));
        mockMvc.perform(get("/api/admin/payments")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void ipnEndpointIsPublic() throws Exception {
        // Missing fields -> should not 401/403 (may return 200 with "IPN processed")
        mockMvc.perform(post("/api/payments/ipn"))
                .andExpect(status().isOk());
    }

    @Test
    void customerPaymentsRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/payments/me"))
                .andExpect(status().isUnauthorized());
    }
}