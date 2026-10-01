package com.portfoliopro.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class PortfolioResponse {
    private BigDecimal totalInvested;
    private BigDecimal currentValue;
    private BigDecimal totalProfitLoss;
    private BigDecimal profitLossPercent;
    private BigDecimal availableCash;
    private BigDecimal holdingsValue;
    private Boolean marketDataAvailable;
    private String valuationStatus;
    private List<HoldingResponse> holdings = new ArrayList<>();

    public PortfolioResponse() {
    }

    public PortfolioResponse(BigDecimal totalInvested, BigDecimal currentValue,
                             BigDecimal totalProfitLoss, BigDecimal profitLossPercent,
                             List<HoldingResponse> holdings) {
        this(totalInvested, currentValue, totalProfitLoss, profitLossPercent, holdings,
             BigDecimal.ZERO, currentValue, true, "REAL_TIME");
    }

    public PortfolioResponse(BigDecimal totalInvested, BigDecimal currentValue,
                             BigDecimal totalProfitLoss, BigDecimal profitLossPercent,
                             List<HoldingResponse> holdings, BigDecimal availableCash,
                             BigDecimal holdingsValue, Boolean marketDataAvailable,
                             String valuationStatus) {
        this.totalInvested = totalInvested;
        this.currentValue = currentValue;
        this.totalProfitLoss = totalProfitLoss;
        this.profitLossPercent = profitLossPercent;
        this.holdings = holdings != null ? holdings : new ArrayList<>();
        this.availableCash = availableCash;
        this.holdingsValue = holdingsValue;
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

    public BigDecimal getHoldingsValue() {
        return holdingsValue;
    }

    public void setHoldingsValue(BigDecimal holdingsValue) {
        this.holdingsValue = holdingsValue;
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

    public List<HoldingResponse> getHoldings() {
        return holdings;
    }

    public void setHoldings(List<HoldingResponse> holdings) {
        this.holdings = holdings;
    }
}
