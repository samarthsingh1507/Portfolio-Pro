package com.portfoliopro.dto.market;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.math.BigDecimal;
import java.time.Instant;

public class MarketQuoteDto {

    private String symbol;
    private BigDecimal price;
    private BigDecimal change;
    private BigDecimal changePercent;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    private Instant timestamp;

    private String marketStatus; // "OPEN", "CLOSED", "PRE_MARKET", "AFTER_HOURS", "UNKNOWN"

    public MarketQuoteDto() {
    }

    public MarketQuoteDto(String symbol,
                          BigDecimal price,
                          BigDecimal change,
                          BigDecimal changePercent,
                          Instant timestamp,
                          String marketStatus) {
        this.symbol = symbol;
        this.price = price;
        this.change = change;
        this.changePercent = changePercent;
        this.timestamp = timestamp;
        this.marketStatus = marketStatus;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public BigDecimal getChange() {
        return change;
    }

    public void setChange(BigDecimal change) {
        this.change = change;
    }

    public BigDecimal getChangePercent() {
        return changePercent;
    }

    public void setChangePercent(BigDecimal changePercent) {
        this.changePercent = changePercent;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public String getMarketStatus() {
        return marketStatus;
    }

    public void setMarketStatus(String marketStatus) {
        this.marketStatus = marketStatus;
    }

    @Override
    public String toString() {
        return "MarketQuoteDto{" +
                "symbol='" + symbol + '\'' +
                ", price=" + price +
                ", change=" + change +
                ", changePercent=" + changePercent +
                ", timestamp=" + timestamp +
                ", marketStatus='" + marketStatus + '\'' +
                '}';
    }
}
