package com.portfoliopro.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class PortfolioAnalyticsResponse {
    private BigDecimal totalInvested;
    private BigDecimal currentValue;
    private BigDecimal totalProfitLoss;
    private BigDecimal profitLossPercent;
    private Integer numberOfHoldings;
    private List<AllocationItemDto> allocation = new ArrayList<>();
    private String diversification;
    private String riskIndicator;

    public PortfolioAnalyticsResponse() {
    }

    public PortfolioAnalyticsResponse(BigDecimal totalInvested, BigDecimal currentValue,
                                      BigDecimal totalProfitLoss, BigDecimal profitLossPercent,
                                      Integer numberOfHoldings, List<AllocationItemDto> allocation,
                                      String diversification, String riskIndicator) {
        this.totalInvested = totalInvested;
        this.currentValue = currentValue;
        this.totalProfitLoss = totalProfitLoss;
        this.profitLossPercent = profitLossPercent;
        this.numberOfHoldings = numberOfHoldings;
        this.allocation = allocation != null ? allocation : new ArrayList<>();
        this.diversification = diversification;
        this.riskIndicator = riskIndicator;
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

    public Integer getNumberOfHoldings() {
        return numberOfHoldings;
    }

    public void setNumberOfHoldings(Integer numberOfHoldings) {
        this.numberOfHoldings = numberOfHoldings;
    }

    public List<AllocationItemDto> getAllocation() {
        return allocation;
    }

    public void setAllocation(List<AllocationItemDto> allocation) {
        this.allocation = allocation;
    }

    public String getDiversification() {
        return diversification;
    }

    public void setDiversification(String diversification) {
        this.diversification = diversification;
    }

    public String getRiskIndicator() {
        return riskIndicator;
    }

    public void setRiskIndicator(String riskIndicator) {
        this.riskIndicator = riskIndicator;
    }
}
