package com.portfoliopro.exception;

public class MarketDataTimeoutException extends MarketDataException {

    public MarketDataTimeoutException(String message) {
        super(message);
    }

    public MarketDataTimeoutException(String message, Throwable cause) {
        super(message, cause);
    }
}
