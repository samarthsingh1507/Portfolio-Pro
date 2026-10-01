package com.portfoliopro.exception;

public class InvalidMarketDataException extends MarketDataException {

    public InvalidMarketDataException(String message) {
        super(message);
    }

    public InvalidMarketDataException(String message, Throwable cause) {
        super(message, cause);
    }
}
