package com.portfoliopro.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class WatchlistResponse {
    private Long id;
    private Long stockId;
    private String symbol;
    private String companyName;
    private BigDecimal price;
    private String sector;
    private BigDecimal peRatio;
    private LocalDateTime addedAt;

    public WatchlistResponse() {
    }

    public WatchlistResponse(Long id, Long stockId, String symbol, String companyName, BigDecimal price, String sector, BigDecimal peRatio, LocalDateTime addedAt) {
        this.id = id;
        this.stockId = stockId;
        this.symbol = symbol;
        this.companyName = companyName;
        this.price = price;
        this.sector = sector;
        this.peRatio = peRatio;
        this.addedAt = addedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public String getSector() {
        return sector;
    }

    public void setSector(String sector) {
        this.sector = sector;
    }

    public BigDecimal getPeRatio() {
        return peRatio;
    }

    public void setPeRatio(BigDecimal peRatio) {
        this.peRatio = peRatio;
    }

    public LocalDateTime getAddedAt() {
        return addedAt;
    }

    public void setAddedAt(LocalDateTime addedAt) {
        this.addedAt = addedAt;
    }
}
