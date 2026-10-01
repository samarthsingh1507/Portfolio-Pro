package com.portfoliopro.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class TechnicalAnalysisResponse {
    private String symbol;
    private BigDecimal currentPrice;
    private BigDecimal movingAverage20;
    private BigDecimal movingAverage50;
    private BigDecimal rsi14;
    private List<PriceHistoryItemDto> priceHistory = new ArrayList<>();

    public TechnicalAnalysisResponse() {
    }

    public TechnicalAnalysisResponse(String symbol, BigDecimal currentPrice,
                                     BigDecimal movingAverage20, BigDecimal movingAverage50,
                                     BigDecimal rsi14, List<PriceHistoryItemDto> priceHistory) {
        this.symbol = symbol;
        this.currentPrice = currentPrice;
        this.movingAverage20 = movingAverage20;
        this.movingAverage50 = movingAverage50;
        this.rsi14 = rsi14;
        this.priceHistory = priceHistory != null ? priceHistory : new ArrayList<>();
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public BigDecimal getCurrentPrice() {
        return currentPrice;
    }

    public void setCurrentPrice(BigDecimal currentPrice) {
        this.currentPrice = currentPrice;
    }

    public BigDecimal getMovingAverage20() {
        return movingAverage20;
    }

    public void setMovingAverage20(BigDecimal movingAverage20) {
        this.movingAverage20 = movingAverage20;
    }

    public BigDecimal getMovingAverage50() {
        return movingAverage50;
    }

    public void setMovingAverage50(BigDecimal movingAverage50) {
        this.movingAverage50 = movingAverage50;
    }

    public BigDecimal getRsi14() {
        return rsi14;
    }

    public void setRsi14(BigDecimal rsi14) {
        this.rsi14 = rsi14;
    }

    public List<PriceHistoryItemDto> getPriceHistory() {
        return priceHistory;
    }

    public void setPriceHistory(List<PriceHistoryItemDto> priceHistory) {
        this.priceHistory = priceHistory;
    }
}
