package com.portfoliopro.dto;

import java.math.BigDecimal;

public class AllocationItemDto {
    private String symbol;
    private BigDecimal percentage;
    private String companyName;
    private BigDecimal currentValue;

    public AllocationItemDto() {
    }

    public AllocationItemDto(String symbol, BigDecimal percentage) {
        this.symbol = symbol;
        this.percentage = percentage;
    }

    public AllocationItemDto(String symbol, BigDecimal percentage, String companyName, BigDecimal currentValue) {
        this.symbol = symbol;
        this.percentage = percentage;
        this.companyName = companyName;
        this.currentValue = currentValue;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public BigDecimal getPercentage() {
        return percentage;
    }

    public void setPercentage(BigDecimal percentage) {
        this.percentage = percentage;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public BigDecimal getCurrentValue() {
        return currentValue;
    }

    public void setCurrentValue(BigDecimal currentValue) {
        this.currentValue = currentValue;
    }
}
