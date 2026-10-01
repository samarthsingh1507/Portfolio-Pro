package com.portfoliopro.service.market.cache;

import com.portfoliopro.dto.market.MarketQuoteDto;

import java.util.Optional;

/**
 * Cache abstraction for short-lived market quotes.
 * Shields external providers from excessive API calls and rate limits.
 */
public interface MarketDataCache {

    /**
     * Retrieves a quote from cache if present and unexpired.
     *
     * @param symbol Ticker symbol
     * @return Optional containing fresh MarketQuoteDto, or empty if absent/expired
     */
    Optional<MarketQuoteDto> get(String symbol);

    /**
     * Retrieves the last known quote even if TTL has elapsed (useful during rate limit spikes).
     *
     * @param symbol Ticker symbol
     * @return Optional containing last known quote or empty
     */
    default Optional<MarketQuoteDto> getStaleFallback(String symbol) {
        return get(symbol);
    }

    /**
     * Stores a quote in the cache with the configured time-to-live.
     *
     * @param symbol Ticker symbol
     * @param quote  MarketQuoteDto
     */
    void put(String symbol, MarketQuoteDto quote);

    /**
     * Invalidates a specific cached symbol.
     *
     * @param symbol Ticker symbol
     */
    void invalidate(String symbol);

    /**
     * Clears all cached entries.
     */
    void clear();

    /**
     * Returns the count of active cached entries.
     *
     * @return Cache size
     */
    int size();
}
