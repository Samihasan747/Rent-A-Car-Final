package com.RentACarDemo.payment;

import com.RentACarDemo.security.CurrentUserProvider;
import com.RentACarDemo.user.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RequestMethod;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final CurrentUserProvider currentUserProvider;

    public PaymentController(PaymentService paymentService, CurrentUserProvider currentUserProvider) {
        this.paymentService = paymentService;
        this.currentUserProvider = currentUserProvider;
    }

    @PostMapping("/initiate")
    public ResponseEntity<Map<String, Object>> initiate(@RequestBody Map<String, Object> body, Authentication authentication) {
        User user = currentUserProvider.require(authentication);
        Long bookingId = Long.valueOf(body.get("bookingId").toString());
        return ResponseEntity.ok(paymentService.initiatePayment(bookingId, user.getId()));
    }

    @PostMapping("/ipn")
    public ResponseEntity<String> ipn(@RequestParam Map<String, String> params) {
        paymentService.handleIpn(params);
        return ResponseEntity.ok("IPN processed");
    }

    @PostMapping("/verify")
    public ResponseEntity<Void> verify(@RequestParam String tranId) {
        paymentService.revalidatePayment(tranId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<List<PaymentResponseDto>> myPayments(Authentication authentication) {
        User user = currentUserProvider.require(authentication);
        List<PaymentResponseDto> dtos = paymentService.getPaymentsForUser(user.getId()).stream()
                .map(PaymentResponseDto::from).toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<List<PaymentResponseDto>> forBooking(@PathVariable Long bookingId, Authentication authentication) {
        User user = currentUserProvider.require(authentication);
        // ownership check
        // (service-level: verify booking belongs to user; admin bypass not needed here)
        List<Payment> payments = paymentService.getPaymentsForBooking(bookingId);
        // filter to caller's own payments unless admin
        boolean isAdmin = user.getRole().name().equals("ADMIN");
        List<PaymentResponseDto> dtos = payments.stream()
                .filter(p -> isAdmin || p.getBooking().getUser().getId().equals(user.getId()))
                .map(PaymentResponseDto::from).toList();
        if (!isAdmin && payments.stream().anyMatch(p -> !p.getBooking().getUser().getId().equals(user.getId()))) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/confirm")
    public ResponseEntity<Map<String, Object>> confirm(@RequestBody Map<String, String> body, Authentication authentication) {
        User user = currentUserProvider.require(authentication);
        String tranId = body.get("tranId");
        return ResponseEntity.ok(paymentService.confirmPaymentDemo(tranId, user.getId()));
    }

    @RequestMapping(value = "/success", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<Void> success(HttpServletRequest request) {
        paymentService.handleIpn(request.getParameterMap().entrySet().stream()
                .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, e -> e.getValue().length > 0 ? e.getValue()[0] : "")));
        String qs = buildQueryString(request);
        String target = "http://localhost:5173/payment/success" + (qs.isEmpty() ? "" : "?" + qs);
        return ResponseEntity.status(302).header("Location", target).build();
    }
    @RequestMapping(value = "/fail", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<Void> fail(HttpServletRequest request) {
        paymentService.handleIpn(request.getParameterMap().entrySet().stream()
                .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, e -> e.getValue().length > 0 ? e.getValue()[0] : "")));
        String qs = buildQueryString(request);
        String target = "http://localhost:5173/payment/fail" + (qs.isEmpty() ? "" : "?" + qs);
        return ResponseEntity.status(302).header("Location", target).build();
    }
    @RequestMapping(value = "/cancel", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<Void> cancel(HttpServletRequest request) {
        paymentService.handleIpn(request.getParameterMap().entrySet().stream()
                .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, e -> e.getValue().length > 0 ? e.getValue()[0] : "")));
        String qs = buildQueryString(request);
        String target = "http://localhost:5173/payment/cancel" + (qs.isEmpty() ? "" : "?" + qs);
        return ResponseEntity.status(302).header("Location", target).build();
    }

    private String buildQueryString(HttpServletRequest request) {
        Map<String, String[]> pm = request.getParameterMap();
        if (pm == null || pm.isEmpty()) {
            String qs = request.getQueryString();
            return qs == null ? "" : qs;
        }
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String[]> e : pm.entrySet()) {
            for (String v : e.getValue()) {
                if (sb.length() > 0) sb.append("&");
                try {
                    sb.append(java.net.URLEncoder.encode(e.getKey(), java.nio.charset.StandardCharsets.UTF_8))
                      .append("=")
                      .append(java.net.URLEncoder.encode(v, java.nio.charset.StandardCharsets.UTF_8));
                } catch (Exception ignored) {
                    sb.append(e.getKey()).append("=").append(v);
                }
            }
        }
        return sb.toString();
    }
}