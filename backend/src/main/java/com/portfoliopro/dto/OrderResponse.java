package com.portfoliopro.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class OrderResponse {
    private Long orderId;
    private Long stockId;
    private String symbol;
    private String companyName;
    private String type;
    private Integer quantity;
    private BigDecimal price;
    private BigDecimal totalValue;
    private String status;
    private LocalDateTime createdAt;

    public OrderResponse() {
    }

    public OrderResponse(Long orderId, Long stockId, String symbol, String companyName, String type, Integer quantity, BigDecimal price, BigDecimal totalValue, String status, LocalDateTime createdAt) {
        this.orderId = orderId;
        this.stockId = stockId;
        this.symbol = symbol;
        this.companyName = companyName;
        this.type = type;
        this.quantity = quantity;
        this.price = price;
        this.totalValue = totalValue;
        this.status = status;
        this.createdAt = createdAt;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public Long getStockId() {
        return stockId;
    }

    public void setStockId(Long stockId) {
        this.stockId = stockId;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public BigDecimal getTotalValue() {
        return totalValue;
    }

    public void setTotalValue(BigDecimal totalValue) {
        this.totalValue = totalValue;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
