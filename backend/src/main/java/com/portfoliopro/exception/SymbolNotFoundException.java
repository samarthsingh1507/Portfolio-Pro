package com.portfoliopro.exception;

public class SymbolNotFoundException extends MarketDataException {

    public SymbolNotFoundException(String symbol) {
        super("Market symbol not found or invalid: " + symbol);
    }
}
