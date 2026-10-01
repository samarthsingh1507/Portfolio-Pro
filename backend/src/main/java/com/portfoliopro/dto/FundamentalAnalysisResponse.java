package com.portfoliopro.dto;

import java.math.BigDecimal;

public class FundamentalAnalysisResponse {
    private String symbol;
    private String companyName;
    private String sector;
    private Long marketCap;
    private BigDecimal eps;
    private BigDecimal peRatio;

    public FundamentalAnalysisResponse() {
    }

    public FundamentalAnalysisResponse(String symbol, String companyName, String sector,
                                       Long marketCap, BigDecimal eps, BigDecimal peRatio) {
        this.symbol = symbol;
        this.companyName = companyName;
        this.sector = sector;
        this.marketCap = marketCap;
        this.eps = eps;
        this.peRatio = peRatio;
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

    public String getSector() {
        return sector;
    }

    public void setSector(String sector) {
        this.sector = sector;
    }

    public Long getMarketCap() {
        return marketCap;
    }

    public void setMarketCap(Long marketCap) {
        this.marketCap = marketCap;
    }

    public BigDecimal getEps() {
        return eps;
    }

    public void setEps(BigDecimal eps) {
        this.eps = eps;
    }

    public BigDecimal getPeRatio() {
        return peRatio;
    }

    public void setPeRatio(BigDecimal peRatio) {
        this.peRatio = peRatio;
    }
}
