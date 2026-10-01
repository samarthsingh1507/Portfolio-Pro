package com.portfoliopro.dto;

import java.math.BigDecimal;

public class PortfolioSummaryResponse {
    private BigDecimal totalInvested;
    private BigDecimal currentValue;
    private BigDecimal totalProfitLoss;
    private BigDecimal profitLossPercent;
    private BigDecimal availableCash;
    private Boolean marketDataAvailable;
    private String valuationStatus;

    public PortfolioSummaryResponse() {
    }

    public PortfolioSummaryResponse(BigDecimal totalInvested, BigDecimal currentValue,
                                    BigDecimal totalProfitLoss, BigDecimal profitLossPercent) {
        this(totalInvested, currentValue, totalProfitLoss, profitLossPercent, BigDecimal.ZERO, true, "REAL_TIME");
    }

    public PortfolioSummaryResponse(BigDecimal totalInvested, BigDecimal currentValue,
                                    BigDecimal totalProfitLoss, BigDecimal profitLossPercent,
                                    BigDecimal availableCash, Boolean marketDataAvailable,
                                    String valuationStatus) {
        this.totalInvested = totalInvested;
        this.currentValue = currentValue;
        this.totalProfitLoss = totalProfitLoss;
        this.profitLossPercent = profitLossPercent;
        this.availableCash = availableCash;
        this.marketDataAvailable = marketDataAvailable;
        this.valuationStatus = valuationStatus;
    }

    public BigDecimal getTotalInvested() {
        return totalInvested;
    }

    public void setTotalInvested(BigDecimal totalInvested) {
        this.totalInvested = totalInvested;
    }

    public BigDecimal getCurrentValue() {
        return currentValue;
    }

    public void setCurrentValue(BigDecimal currentValue) {
        this.currentValue = currentValue;
    }

    public BigDecimal getTotalProfitLoss() {
        return totalProfitLoss;
    }

    public void setTotalProfitLoss(BigDecimal totalProfitLoss) {
        this.totalProfitLoss = totalProfitLoss;
    }

    public BigDecimal getProfitLossPercent() {
        return profitLossPercent;
    }

    public void setProfitLossPercent(BigDecimal profitLossPercent) {
        this.profitLossPercent = profitLossPercent;
    }

    public BigDecimal getAvailableCash() {
        return availableCash;
    }

    public void setAvailableCash(BigDecimal availableCash) {
        this.availableCash = availableCash;
    }

    public Boolean getMarketDataAvailable() {
        return marketDataAvailable;
    }

    public void setMarketDataAvailable(Boolean marketDataAvailable) {
        this.marketDataAvailable = marketDataAvailable;
    }

    public String getValuationStatus() {
        return valuationStatus;
    }

    public void setValuationStatus(String valuationStatus) {
        this.valuationStatus = valuationStatus;
    }
}
