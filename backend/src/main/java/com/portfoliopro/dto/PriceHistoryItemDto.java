package com.portfoliopro.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class PriceHistoryItemDto {
    private LocalDate date;
    private BigDecimal openPrice;
    private BigDecimal highPrice;
    private BigDecimal lowPrice;
    private BigDecimal closePrice;

    public PriceHistoryItemDto() {
    }

    public PriceHistoryItemDto(LocalDate date, BigDecimal closePrice) {
        this.date = date;
        this.openPrice = closePrice;
        this.highPrice = closePrice;
        this.lowPrice = closePrice;
        this.closePrice = closePrice;
    }

    public PriceHistoryItemDto(LocalDate date, BigDecimal openPrice, BigDecimal highPrice, BigDecimal lowPrice, BigDecimal closePrice) {
        this.date = date;
        this.openPrice = openPrice;
        this.highPrice = highPrice;
        this.lowPrice = lowPrice;
        this.closePrice = closePrice;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public BigDecimal getOpenPrice() {
        return openPrice != null ? openPrice : closePrice;
    }

    public void setOpenPrice(BigDecimal openPrice) {
        this.openPrice = openPrice;
    }

    public BigDecimal getHighPrice() {
        return highPrice != null ? highPrice : closePrice;
    }

    public void setHighPrice(BigDecimal highPrice) {
        this.highPrice = highPrice;
    }

    public BigDecimal getLowPrice() {
        return lowPrice != null ? lowPrice : closePrice;
    }

    public void setLowPrice(BigDecimal lowPrice) {
        this.lowPrice = lowPrice;
    }

    public BigDecimal getClosePrice() {
        return closePrice;
    }

    public void setClosePrice(BigDecimal closePrice) {
        this.closePrice = closePrice;
    }
}
