package com.portfoliopro.exception;

public class MarketDataProviderUnavailableException extends MarketDataException {

    public MarketDataProviderUnavailableException(String message) {
        super(message);
    }

    public MarketDataProviderUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
