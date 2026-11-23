package com.RentACarDemo.payment;

import java.math.BigDecimal;
import java.time.Instant;

public class PaymentResponseDto {
    private Long id;
    private Long bookingId;
    private String tranId;
    private BigDecimal amount;
    private String currency;
    private String paymentMethod;
    private String cardBrand;
    private String cardNoMasked;
    private PaymentStatus status;
    private Integer riskLevel;
    private Instant initiatedAt;
    private Instant completedAt;
    private RefundStatus refundStatus;
    private BigDecimal refundAmount;
    private Instant refundRequestedAt;

    // getters/setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }
    public String getTranId() { return tranId; }
    public void setTranId(String tranId) { this.tranId = tranId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getCardBrand() { return cardBrand; }
    public void setCardBrand(String cardBrand) { this.cardBrand = cardBrand; }
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
    public RefundStatus getRefundStatus() { return refundStatus; }
    public void setRefundStatus(RefundStatus refundStatus) { this.refundStatus = refundStatus; }
    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }
    public Instant getRefundRequestedAt() { return refundRequestedAt; }
    public void setRefundRequestedAt(Instant refundRequestedAt) { this.refundRequestedAt = refundRequestedAt; }

    public static PaymentResponseDto from(Payment p) {
        PaymentResponseDto d = new PaymentResponseDto();
        d.setId(p.getId());
        d.setBookingId(p.getBooking() != null ? p.getBooking().getId() : null);
        d.setTranId(p.getTranId());
        d.setAmount(p.getAmount());
        d.setCurrency(p.getCurrency());
        d.setPaymentMethod(p.getPaymentMethod());
        d.setCardBrand(p.getCardBrand());
        d.setCardNoMasked(p.getCardNoMasked());
        d.setStatus(p.getStatus());
        d.setRiskLevel(p.getRiskLevel());
        d.setInitiatedAt(p.getInitiatedAt());
        d.setCompletedAt(p.getCompletedAt());
        d.setRefundStatus(p.getRefundStatus());
        d.setRefundAmount(p.getRefundAmount());
        d.setRefundRequestedAt(p.getRefundRequestedAt());
        return d;
    }
}