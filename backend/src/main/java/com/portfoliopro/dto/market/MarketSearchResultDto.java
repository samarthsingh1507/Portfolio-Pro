package com.portfoliopro.dto.market;

public class MarketSearchResultDto {

    private String symbol;
    private String description;
    private String type;
    private String exchange;

    public MarketSearchResultDto() {
    }

    public MarketSearchResultDto(String symbol, String description, String type, String exchange) {
        this.symbol = symbol;
        this.description = description;
        this.type = type;
        this.exchange = exchange;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getExchange() {
        return exchange;
    }

    public void setExchange(String exchange) {
        this.exchange = exchange;
    }

    @Override
    public String toString() {
        return "MarketSearchResultDto{" +
                "symbol='" + symbol + '\'' +
                ", description='" + description + '\'' +
                ", type='" + type + '\'' +
                ", exchange='" + exchange + '\'' +
                '}';
    }
}
