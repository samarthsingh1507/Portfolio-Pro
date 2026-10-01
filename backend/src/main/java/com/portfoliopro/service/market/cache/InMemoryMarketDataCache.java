package com.portfoliopro.service.market.cache;

import com.portfoliopro.dto.market.MarketQuoteDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe in-memory cache for market quotes with configurable TTL eviction.
 */
@Component
public class InMemoryMarketDataCache implements MarketDataCache {

    private static final Logger log = LoggerFactory.getLogger(InMemoryMarketDataCache.class);

    private final Duration ttl;
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    @org.springframework.beans.factory.annotation.Autowired
    public InMemoryMarketDataCache(@Value("${market.data.cache-ttl-seconds:15}") int ttlSeconds) {
        this.ttl = Duration.ofSeconds(Math.max(1, ttlSeconds));
        log.info("Initialized InMemoryMarketDataCache with TTL={}s", this.ttl.toSeconds());
    }

    // Constructor for testing with specific TTL
    public InMemoryMarketDataCache(Duration ttl) {
        this.ttl = ttl != null ? ttl : Duration.ofSeconds(15);
    }

    @Override
    public Optional<MarketQuoteDto> get(String symbol) {
        if (symbol == null) return Optional.empty();

        String key = symbol.trim().toUpperCase();
        CacheEntry entry = cache.get(key);

        if (entry == null) {
            return Optional.empty();
        }

        if (Instant.now().isAfter(entry.expiresAt)) {
            return Optional.empty();
        }

        log.debug("Cache HIT for symbol=[{}]", key);
        return Optional.of(entry.quote);
    }

    @Override
    public Optional<MarketQuoteDto> getStaleFallback(String symbol) {
        if (symbol == null) return Optional.empty();
        String key = symbol.trim().toUpperCase();
        CacheEntry entry = cache.get(key);
        return entry != null ? Optional.of(entry.quote) : Optional.empty();
    }

    @Override
    public void put(String symbol, MarketQuoteDto quote) {
        if (symbol == null || quote == null) return;

        String key = symbol.trim().toUpperCase();
        Instant expiresAt = Instant.now().plus(this.ttl);
        cache.put(key, new CacheEntry(quote, expiresAt));
        log.debug("Cached quote for symbol=[{}] with TTL={}s", key, this.ttl.toSeconds());
    }

    @Override
    public void invalidate(String symbol) {
        if (symbol != null) {
            cache.remove(symbol.trim().toUpperCase());
        }
    }

    @Override
    public void clear() {
        cache.clear();
    }

    @Override
    public int size() {
        // Purge expired entries before reporting size
        Instant now = Instant.now();
        cache.entrySet().removeIf(e -> now.isAfter(e.getValue().expiresAt));
        return cache.size();
    }

    private static class CacheEntry {
        final MarketQuoteDto quote;
        final Instant expiresAt;

        CacheEntry(MarketQuoteDto quote, Instant expiresAt) {
            this.quote = quote;
            this.expiresAt = expiresAt;
        }
    }
}
