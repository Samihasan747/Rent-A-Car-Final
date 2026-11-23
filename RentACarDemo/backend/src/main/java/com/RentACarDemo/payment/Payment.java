package com.RentACarDemo.payment;

import com.RentACarDemo.booking.Booking;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(name = "tran_id", nullable = false, unique = true, length = 64)
    private String tranId;

    @Column(name = "gateway_tran_id", length = 80)
    private String gatewayTranId;

    @Column(name = "val_id", length = 64)
    private String valId;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "BDT";

    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    @Column(name = "card_brand", length = 30)
    private String cardBrand;

    @Column(name = "card_issuer", length = 100)
    private String cardIssuer;

    @Column(name = "card_no_masked", length = 20)
    private String cardNoMasked;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PaymentStatus status = PaymentStatus.INITIATED;

    @Column(name = "risk_level")
    private Integer riskLevel;

    @Column(name = "initiated_at", nullable = false)
    private Instant initiatedAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "ipn_received_at")
    private Instant ipnReceivedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_status", nullable = false, length = 20)
    private RefundStatus refundStatus = RefundStatus.NONE;

    @Column(name = "refund_amount", precision = 12, scale = 2)
    private BigDecimal refundAmount;

    @Column(name = "refund_requested_at")
    private Instant refundRequestedAt;

    // getters/setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Booking getBooking() { return booking; }
    public void setBooking(Booking booking) { this.booking = booking; }
    public String getTranId() { return tranId; }
    public void setTranId(String tranId) { this.tranId = tranId; }
    public String getGatewayTranId() { return gatewayTranId; }
    public void setGatewayTranId(String gatewayTranId) { this.gatewayTranId = gatewayTranId; }
    public String getValId() { return valId; }
    public void setValId(String valId) { this.valId = valId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getCardBrand() { return cardBrand; }
    public void setCardBrand(String cardBrand) { this.cardBrand = cardBrand; }
    public String getCardIssuer() { return cardIssuer; }
    public void setCardIssuer(String cardIssuer) { this.cardIssuer = cardIssuer; }
    public String getCardNoMasked() { return cardNoMasked; }
    public void setCardNoMasked(String cardNoMasked) { this.cardNoMasked = cardNoMasked; }
    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }
    public Integer getRiskLevel() { return riskLevel; }
    public void setRiskLevel(Integer riskLevel) { this.riskLevel = riskLevel; }
    public Instant getInitiatedAt() { return initiatedAt; }
    public void setInitiatedAt(Instant initiatedAt) { this.initiatedAt = initiatedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public Instant getIpnReceivedAt() { return ipnReceivedAt; }
    public void setIpnReceivedAt(Instant ipnReceivedAt) { this.ipnReceivedAt = ipnReceivedAt; }
    public RefundStatus getRefundStatus() { return refundStatus; }
    public void setRefundStatus(RefundStatus refundStatus) { this.refundStatus = refundStatus; }
    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }
    public Instant getRefundRequestedAt() { return refundRequestedAt; }
    public void setRefundRequestedAt(Instant refundRequestedAt) { this.refundRequestedAt = refundRequestedAt; }
}