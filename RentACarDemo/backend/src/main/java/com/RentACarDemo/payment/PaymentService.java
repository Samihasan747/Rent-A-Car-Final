package com.RentACarDemo.payment;

import com.RentACarDemo.booking.Booking;
import com.RentACarDemo.booking.BookingRepository;
import com.RentACarDemo.booking.BookingService;
import com.RentACarDemo.booking.BookingStatus;
import com.RentACarDemo.exceptions.ConflictException;
import com.RentACarDemo.exceptions.ResourceNotFoundException;
import com.RentACarDemo.user.User;
import com.RentACarDemo.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final BookingService bookingService;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    @Value("${sslcommerz.store-id:testbox}")
    private String storeId;
    @Value("${sslcommerz.store-password:qwerty}")
    private String storePassword;
    @Value("${sslcommerz.sandbox:true}")
    private boolean sandbox;
    @Value("${sslcommerz.base-url:https://sandbox.sslcommerz.com}")
    private String baseUrl;
    @Value("${app.payment.success-url:http://localhost:8080/api/payments/success}")
    private String successUrl;
    @Value("${app.payment.fail-url:http://localhost:8080/api/payments/fail}")
    private String failUrl;
    @Value("${app.payment.cancel-url:http://localhost:8080/api/payments/cancel}")
    private String cancelUrl;
    @Value("${app.payment.ipn-url:http://localhost:8080/api/payments/ipn}")
    private String ipnUrl;
    @Value("${app.booking.payment-expiry-minutes:15}")
    private int expiryMinutes;

    public PaymentService(PaymentRepository paymentRepository,
                         BookingRepository bookingRepository,
                         BookingService bookingService,
                         UserRepository userRepository,
                         RestTemplate restTemplate) {
        this.paymentRepository = paymentRepository;
        this.bookingRepository = bookingRepository;
        this.bookingService = bookingService;
        this.userRepository = userRepository;
        this.restTemplate = restTemplate != null ? restTemplate : new RestTemplate();
    }

    @org.springframework.beans.factory.annotation.Autowired
    public PaymentService(PaymentRepository paymentRepository,
                         BookingRepository bookingRepository,
                         BookingService bookingService,
                         UserRepository userRepository) {
        this(paymentRepository, bookingRepository, bookingService, userRepository, new RestTemplate());
    }

    @Transactional
    public Map<String, Object> initiatePayment(Long bookingId, Long userId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking with id " + bookingId + " does not exist"));
        if (!booking.getUser().getId().equals(userId)) {
            throw new ConflictException("You do not own this booking");
        }
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new ConflictException("Booking is not awaiting payment");
        }
        if (paymentRepository.findFirstByBookingIdAndStatusOrderByInitiatedAtDesc(bookingId, PaymentStatus.VALID).isPresent()) {
            throw new ConflictException("Booking already paid");
        }

        String tranId = "VELOCITY-" + UUID.randomUUID();
        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setTranId(tranId);
        payment.setAmount(booking.getTotalPrice());
        payment.setCurrency("BDT");
        payment.setStatus(PaymentStatus.INITIATED);
        paymentRepository.save(payment);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("store_id", storeId);
        params.add("store_passwd", storePassword);
        params.add("total_amount", booking.getTotalPrice().toPlainString());
        params.add("currency", "BDT");
        params.add("tran_id", tranId);
        params.add("success_url", successUrl);
        params.add("fail_url", failUrl);
        params.add("cancel_url", cancelUrl);
        params.add("ipn_url", ipnUrl);
        params.add("cus_name", booking.getUser().getName());
        params.add("cus_email", booking.getUser().getEmail());
        params.add("cus_add1", "Dhaka");
        params.add("cus_city", "Dhaka");
        params.add("cus_postcode", "1000");
        params.add("cus_country", "Bangladesh");
        params.add("cus_phone", "01700000000");
        params.add("shipping_method", "NO");
        params.add("num_of_item", "1");
        params.add("product_name", "Car rental booking #" + booking.getId());
        params.add("product_category", "car rental");
        params.add("product_profile", "general");
        params.add("product_amount", booking.getTotalPrice().toPlainString());

        String endpoint = baseUrl + "/gwprocess/v4/api.php";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(params, headers);
        ResponseEntity<Map> resp = restTemplate.postForEntity(endpoint, entity, Map.class);
        Map body = resp.getBody();
        if (body == null || !"SUCCESS".equals(body.get("status"))) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            throw new ConflictException("Failed to initiate payment: " + (body == null ? "no response" : body.get("failedreason")));
        }
        payment.setStatus(PaymentStatus.PENDING);
        paymentRepository.save(payment);

        return Map.of(
                "paymentId", payment.getId(),
                "tranId", tranId,
                "gatewayUrl", body.get("GatewayPageURL")
        );
    }

    @Transactional
    public void handleIpn(Map<String, String> params) {
        String tranId = params.get("tran_id");
        String valId = params.get("val_id");
        String verifySign = params.get("verify_sign");
        String verifyKey = params.get("verify_key");
        if (tranId == null || valId == null) return;

        Payment payment = paymentRepository.findByTranId(tranId).orElse(null);
        if (payment == null) return;

        // Verify signature if provided
        if (verifySign != null && verifyKey != null) {
            if (!verifySignature(verifySign, verifyKey, params)) {
                return; // invalid signature, ignore
            }
        }

        payment.setIpnReceivedAt(Instant.now());
        payment.setValId(valId);

        // Idempotent: already valid
        if (payment.getStatus() == PaymentStatus.VALID) {
            paymentRepository.save(payment);
            return;
        }

        // Lock booking row
        Booking booking = bookingRepository.findByIdForUpdate(payment.getBooking().getId())
                .orElse(null);
        if (booking == null) {
            paymentRepository.save(payment);
            return;
        }

        // Validate with gateway
        String url = baseUrl + "/validator/api/validationserverAPI.php"
                + "?val_id=" + valId
                + "&store_id=" + storeId
                + "&store_passwd=" + storePassword
                + "&format=json";
        ResponseEntity<Map> resp;
        try {
            resp = restTemplate.getForEntity(url, Map.class);
        } catch (Exception e) {
            paymentRepository.save(payment);
            return;
        }
        Map body = resp.getBody();
        if (body == null) {
            paymentRepository.save(payment);
            return;
        }
        String gwStatus = String.valueOf(body.get("status"));
        String gwAmount = String.valueOf(body.get("amount"));
        String gwCurrency = String.valueOf(body.get("currency"));
        Integer riskLevel = parseInt(String.valueOf(body.get("risk_level")));

        boolean amountOk = false;
        boolean currencyOk = "BDT".equalsIgnoreCase(gwCurrency);
        try {
            amountOk = new BigDecimal(gwAmount).compareTo(payment.getAmount()) == 0;
        } catch (Exception ignored) {}

        payment.setRiskLevel(riskLevel);

        if ("VALID".equalsIgnoreCase(gwStatus) || "VALIDATED".equalsIgnoreCase(gwStatus)) {
            if (amountOk && currencyOk) {
                // risk check: hold if risk_level == 1
                if (riskLevel != null && riskLevel == 1) {
                    payment.setStatus(PaymentStatus.PENDING);
                    paymentRepository.save(payment);
                    return;
                }
                // check no other valid payment
                if (paymentRepository.findFirstByBookingIdAndStatusOrderByInitiatedAtDesc(booking.getId(), PaymentStatus.VALID).isEmpty()) {
                    payment.setStatus(PaymentStatus.VALID);
                    payment.setCompletedAt(Instant.now());
                    payment.setGatewayTranId(params.get("bank_tran_id"));
                    payment.setPaymentMethod(params.get("card_type"));
                    payment.setCardBrand(params.get("card_brand"));
                    payment.setCardIssuer(params.get("card_issuer"));
                    payment.setCardNoMasked(maskCard(params.get("card_no")));
                    paymentRepository.save(payment);

                    // confirm or late-payment handling
                    if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
                        Instant expiry = booking.getCreatedAt().plus(expiryMinutes, java.time.temporal.ChronoUnit.MINUTES);
                        if (Instant.now().isAfter(expiry)) {
                            payment.setRefundStatus(RefundStatus.PENDING);
                            payment.setRefundAmount(payment.getAmount());
                            payment.setRefundRequestedAt(Instant.now());
                            paymentRepository.save(payment);
                        } else {
                            booking.setStatus(BookingStatus.CONFIRMED);
                            bookingRepository.save(booking);
                        }
                    } else if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.EXPIRED) {
                        payment.setRefundStatus(RefundStatus.PENDING);
                        payment.setRefundAmount(payment.getAmount());
                        payment.setRefundRequestedAt(Instant.now());
                        paymentRepository.save(payment);
                    } else if (booking.getStatus() == BookingStatus.CONFIRMED) {
                        // second successful payment -> refund obligation
                        payment.setRefundStatus(RefundStatus.PENDING);
                        payment.setRefundAmount(payment.getAmount());
                        payment.setRefundRequestedAt(Instant.now());
                        paymentRepository.save(payment);
                    }
                } else {
                    // another payment already valid -> this is a duplicate success -> refund obligation
                    payment.setStatus(PaymentStatus.VALID);
                    payment.setCompletedAt(Instant.now());
                    payment.setGatewayTranId(params.get("bank_tran_id"));
                    payment.setPaymentMethod(params.get("card_type"));
                    payment.setCardBrand(params.get("card_brand"));
                    payment.setCardIssuer(params.get("card_issuer"));
                    payment.setCardNoMasked(maskCard(params.get("card_no")));
                    payment.setRefundStatus(RefundStatus.PENDING);
                    payment.setRefundAmount(payment.getAmount());
                    payment.setRefundRequestedAt(Instant.now());
                    paymentRepository.save(payment);
                }
            } else {
                payment.setStatus(PaymentStatus.FAILED);
                paymentRepository.save(payment);
            }
        } else if ("FAILED".equalsIgnoreCase(gwStatus)) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
        } else if ("CANCELLED".equalsIgnoreCase(gwStatus)) {
            payment.setStatus(PaymentStatus.CANCELLED);
            paymentRepository.save(payment);
        } else {
            payment.setStatus(PaymentStatus.EXPIRED);
            paymentRepository.save(payment);
        }
    }

    private boolean verifySignature(String verifySign, String verifyKey, Map<String, String> params) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            String storePassMd5 = md5(storePassword);
            StringBuilder data = new StringBuilder();
            for (String key : verifyKey.split(",")) {
                String val = params.get(key.trim());
                if (val != null) data.append(val);
            }
            String generated = md5(storePassMd5 + data.toString());
            return generated.equalsIgnoreCase(verifySign);
        } catch (Exception e) {
            return false;
        }
    }

    private String md5(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private String maskCard(String cardNo) {
        if (cardNo == null || cardNo.length() < 4) return null;
        return "****" + cardNo.substring(cardNo.length() - 4);
    }

    private Integer parseInt(String s) {
        try { return s == null ? null : Integer.parseInt(s); } catch (Exception e) { return null; }
    }

    public java.util.List<Payment> getPaymentsForBooking(Long bookingId) {
        return paymentRepository.findByBookingIdOrderByInitiatedAtDesc(bookingId);
    }

    public java.util.List<Payment> getPaymentsForUser(Long userId) {
        return paymentRepository.findByBooking_User_IdOrderByInitiatedAtDesc(userId);
    }

    public java.util.List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }

    @Transactional
    public Map<String, Object> confirmPaymentDemo(String tranId, Long userId) {
        if (tranId == null) throw new ConflictException("Missing transaction reference");
        Payment payment = paymentRepository.findByTranId(tranId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        Booking booking = payment.getBooking();
        if (!booking.getUser().getId().equals(userId)) {
            throw new ConflictException("You do not own this booking");
        }
        // idempotent: already valid
        if (payment.getStatus() == PaymentStatus.VALID) {
            if (booking.getStatus() != BookingStatus.CONFIRMED) {
                booking.setStatus(BookingStatus.CONFIRMED);
                bookingRepository.save(booking);
            }
            return Map.of("status", "VALID", "bookingStatus", booking.getStatus().name());
        }
        // guard: cannot confirm expired/cancelled
        if (booking.getStatus() == BookingStatus.EXPIRED || booking.getStatus() == BookingStatus.CANCELLED) {
            throw new ConflictException("Booking is no longer payable");
        }
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new ConflictException("Booking is not awaiting payment");
        }
        payment.setStatus(PaymentStatus.VALID);
        payment.setCompletedAt(Instant.now());
        payment.setRefundStatus(RefundStatus.NONE);
        paymentRepository.save(payment);

        if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
            booking.setStatus(BookingStatus.CONFIRMED);
            bookingRepository.save(booking);
        }
        return Map.of("status", "VALID", "bookingStatus", booking.getStatus().name());
    }

    @Transactional
    public void revalidatePayment(String tranId) {
        if (tranId == null) return;
        Payment payment = paymentRepository.findByTranId(tranId).orElse(null);
        if (payment == null) return;
        Map<String, String> params = new HashMap<>();
        params.put("tran_id", tranId);
        if (payment.getValId() != null) params.put("val_id", payment.getValId());
        handleIpn(params);
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void expirePendingPaymentsScheduled() {
        Instant cutoff = Instant.now().minus(expiryMinutes, java.time.temporal.ChronoUnit.MINUTES);
        for (Payment p : paymentRepository.findAll()) {
            if (p.getStatus() == PaymentStatus.VALID) continue;
            Booking b = p.getBooking();
            if (b.getStatus() == BookingStatus.EXPIRED
                    || b.getCreatedAt().isBefore(cutoff)) {
                if (p.getStatus() != PaymentStatus.EXPIRED) {
                    p.setStatus(PaymentStatus.EXPIRED);
                    paymentRepository.save(p);
                }
            }
        }
    }

    @Transactional
    public void expirePaymentsForExpiredBookings() {
        // expire pending payments for bookings that are EXPIRED
        // (best-effort; called by scheduler or on read)
    }
}