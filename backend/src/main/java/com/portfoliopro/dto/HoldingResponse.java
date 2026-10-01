package com.portfoliopro.dto;

import java.math.BigDecimal;

public class HoldingResponse {
    private Long stockId;
    private String symbol;
    private String companyName;
    private Integer quantity;
    private BigDecimal averageBuyPrice;
    private BigDecimal currentPrice;
    private BigDecimal investedValue;
    private BigDecimal currentValue;
    private BigDecimal profitLoss;
    private BigDecimal profitLossPercent;
    private Boolean marketDataAvailable;
    private String marketStatus;
    private String quoteTimestamp;

    public HoldingResponse() {
    }

    public HoldingResponse(Long stockId, String symbol, String companyName, Integer quantity,
                           BigDecimal averageBuyPrice, BigDecimal currentPrice,
                           BigDecimal investedValue, BigDecimal currentValue,
                           BigDecimal profitLoss, BigDecimal profitLossPercent) {
        this(stockId, symbol, companyName, quantity, averageBuyPrice, currentPrice,
             investedValue, currentValue, profitLoss, profitLossPercent,
             currentPrice != null, null, null);
    }

    public HoldingResponse(Long stockId, String symbol, String companyName, Integer quantity,
                           BigDecimal averageBuyPrice, BigDecimal currentPrice,
                           BigDecimal investedValue, BigDecimal currentValue,
                           BigDecimal profitLoss, BigDecimal profitLossPercent,
                           Boolean marketDataAvailable, String marketStatus, String quoteTimestamp) {
        this.stockId = stockId;
        this.symbol = symbol;
        this.companyName = companyName;
        this.quantity = quantity;
        this.averageBuyPrice = averageBuyPrice;
        this.currentPrice = currentPrice;
        this.investedValue = investedValue;
        this.currentValue = currentValue;
        this.profitLoss = profitLoss;
        this.profitLossPercent = profitLossPercent;
        this.marketDataAvailable = marketDataAvailable != null ? marketDataAvailable : (currentPrice != null);
        this.marketStatus = marketStatus;
        this.quoteTimestamp = quoteTimestamp;
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

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getAverageBuyPrice() {
        return averageBuyPrice;
    }

    public void setAverageBuyPrice(BigDecimal averageBuyPrice) {
        this.averageBuyPrice = averageBuyPrice;
    }

    public BigDecimal getCurrentPrice() {
        return currentPrice;
    }

    public void setCurrentPrice(BigDecimal currentPrice) {
        this.currentPrice = currentPrice;
    }

    public BigDecimal getInvestedValue() {
        return investedValue;
    }

    public void setInvestedValue(BigDecimal investedValue) {
        this.investedValue = investedValue;
    }

    public BigDecimal getCurrentValue() {
        return currentValue;
    }

    public void setCurrentValue(BigDecimal currentValue) {
        this.currentValue = currentValue;
    }

    public BigDecimal getProfitLoss() {
        return profitLoss;
    }

    public void setProfitLoss(BigDecimal profitLoss) {
        this.profitLoss = profitLoss;
    }

    public BigDecimal getProfitLossPercent() {
        return profitLossPercent;
    }

    public void setProfitLossPercent(BigDecimal profitLossPercent) {
        this.profitLossPercent = profitLossPercent;
    }

    public Boolean getMarketDataAvailable() {
        return marketDataAvailable;
    }

    public void setMarketDataAvailable(Boolean marketDataAvailable) {
        this.marketDataAvailable = marketDataAvailable;
    }

    public String getMarketStatus() {
        return marketStatus;
    }

    public void setMarketStatus(String marketStatus) {
        this.marketStatus = marketStatus;
    }

    public String getQuoteTimestamp() {
        return quoteTimestamp;
    }

    public void setQuoteTimestamp(String quoteTimestamp) {
        this.quoteTimestamp = quoteTimestamp;
    }
}
