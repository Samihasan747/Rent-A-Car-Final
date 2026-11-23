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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PhaseAIntegrationTests {

    private static final String PASSWORD = "Password123";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void wrongPasswordReturns401() throws Exception {
        String email = uniqueEmail();
        createUser(email);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email, "WrongPassword123")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.statusCode").value(401));
    }

    @Test
    void cancelWithoutBookingReturns409() throws Exception {
        String email = uniqueEmail();
        createUser(email);
        String token = login(email);

        mockMvc.perform(post("/api/user/cancel")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.statusCode").value(409));
    }

    @Test
    void profileUpdateDoesNotRequirePasswordAndSurvivesEmailChange() throws Exception {
        String email = uniqueEmail();
        String updatedEmail = uniqueEmail();
        createUser(email);
        String token = login(email);

        mockMvc.perform(put("/api/user/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Updated Name\",\"email\":\"" + updatedEmail + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Name"))
                .andExpect(jsonPath("$.email").value(updatedEmail));

        // The token was issued before the email change. The uid claim must keep it valid.
        mockMvc.perform(get("/api/user/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(updatedEmail));
    }

    @Test
    void softDeletedUserCannotAuthenticateOrUseExistingToken() throws Exception {
        String email = uniqueEmail();
        createUser(email);
        String token = login(email);

        mockMvc.perform(patch("/api/user/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/user/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email, PASSWORD)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void duplicateRegistrationReturns409() throws Exception {
        String email = uniqueEmail();

        mockMvc.perform(post("/api/user/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/user/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.statusCode").value(409));
    }

    @Test
    void corsPreflightAllowsConfiguredOrigin() throws Exception {
        mockMvc.perform(options("/api/cars")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "Authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Methods",
                        org.hamcrest.Matchers.containsString("GET")));
    }

    private void createUser(String email) {
        User user = new User();
        user.setName("Phase A Test");
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(PASSWORD));
        user.setRole(Role.CUSTOMER);
        user.setDeleted(false);
        userRepository.saveAndFlush(user);
    }

    private String login(String email) throws Exception {
        String response = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        Matcher matcher = Pattern.compile("\"accessToken\":\"([^\"]+)\"").matcher(response);
        assertTrue(matcher.find(), "Login response did not contain an access token");
        return matcher.group(1);
    }

    private String uniqueEmail() {
        return "phasea-" + UUID.randomUUID() + "@example.com";
    }

    private String loginBody(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    private String registerBody(String email) {
        return "{\"name\":\"Phase A Test\",\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}";
    }
}
