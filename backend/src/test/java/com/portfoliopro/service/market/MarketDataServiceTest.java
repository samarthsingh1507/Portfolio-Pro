package com.portfoliopro.service.market;

import com.portfoliopro.dto.market.MarketQuoteDto;
import com.portfoliopro.dto.market.MarketSearchResultDto;
import com.portfoliopro.exception.BadRequestException;
import com.portfoliopro.service.market.cache.InMemoryMarketDataCache;
import com.portfoliopro.service.market.cache.MarketDataCache;
import com.portfoliopro.service.market.provider.MarketDataProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class MarketDataServiceTest {

    private MarketDataProvider mockProvider;
    private MarketDataCache cache;
    private MarketDataService marketDataService;

    @BeforeEach
    void setUp() {
        mockProvider = Mockito.mock(MarketDataProvider.class);
        cache = new InMemoryMarketDataCache(Duration.ofSeconds(10));
        marketDataService = new MarketDataServiceImpl(mockProvider, cache);
    }

    @Test
    @DisplayName("getQuote: Returns quote and caches it, subsequent call hits cache without calling provider")
    void testGetQuote_CachingBehavior() {
        MarketQuoteDto mockQuote = new MarketQuoteDto(
                "AAPL",
                new BigDecimal("180.50"),
                new BigDecimal("2.10"),
                new BigDecimal("1.18"),
                Instant.now(),
                "OPEN"
        );

        when(mockProvider.fetchQuote("AAPL")).thenReturn(mockQuote);

        // First call - cache miss, hits provider
        MarketQuoteDto quote1 = marketDataService.getQuote("AAPL");
        assertNotNull(quote1);
        assertEquals("AAPL", quote1.getSymbol());
        assertEquals(new BigDecimal("180.50"), quote1.getPrice());
        verify(mockProvider, times(1)).fetchQuote("AAPL");

        // Second call with different casing and whitespace - cache hit, provider NOT called
        MarketQuoteDto quote2 = marketDataService.getQuote("  aapl  ");
        assertNotNull(quote2);
        assertEquals(new BigDecimal("180.50"), quote2.getPrice());
        verify(mockProvider, times(1)).fetchQuote(anyString()); // still 1!
    }

    @Test
    @DisplayName("getQuote: Throws BadRequestException for empty or null symbol")
    void testGetQuote_InvalidInput() {
        assertThrows(BadRequestException.class, () -> marketDataService.getQuote(null));
        assertThrows(BadRequestException.class, () -> marketDataService.getQuote("   "));
        verifyNoInteractions(mockProvider);
    }

    @Test
    @DisplayName("getQuotes: Returns batch quotes with partial cache hits and fetches only missing symbols")
    void testGetQuotes_BatchWithPartialCacheHit() {
        // Pre-populate cache with AAPL
        MarketQuoteDto aaplQuote = new MarketQuoteDto("AAPL", new BigDecimal("180.00"), BigDecimal.ZERO, BigDecimal.ZERO, Instant.now(), "OPEN");
        cache.put("AAPL", aaplQuote);

        MarketQuoteDto msftQuote = new MarketQuoteDto("MSFT", new BigDecimal("410.00"), BigDecimal.ZERO, BigDecimal.ZERO, Instant.now(), "OPEN");
        MarketQuoteDto tslaQuote = new MarketQuoteDto("TSLA", new BigDecimal("240.00"), BigDecimal.ZERO, BigDecimal.ZERO, Instant.now(), "OPEN");

        when(mockProvider.fetchQuotes(List.of("MSFT", "TSLA"))).thenReturn(List.of(msftQuote, tslaQuote));

        // Request batch: AAPL, MSFT, TSLA
        List<MarketQuoteDto> quotes = marketDataService.getQuotes(List.of("AAPL", "MSFT", "TSLA"));

        assertEquals(3, quotes.size());
        assertEquals("AAPL", quotes.get(0).getSymbol());
        assertEquals("MSFT", quotes.get(1).getSymbol());
        assertEquals("TSLA", quotes.get(2).getSymbol());

        // Verify provider was only called for missing symbols
        verify(mockProvider, times(1)).fetchQuotes(List.of("MSFT", "TSLA"));
        verify(mockProvider, never()).fetchQuote(anyString());

        // Verify MSFT and TSLA are now cached
        assertTrue(cache.get("MSFT").isPresent());
        assertTrue(cache.get("TSLA").isPresent());
    }

    @Test
    @DisplayName("getQuotes: Rejects more than 500 symbols")
    void testGetQuotes_ExceedsLimit() {
        List<String> tooManySymbols = new ArrayList<>();
        for (int i = 0; i < 501; i++) {
            tooManySymbols.add("SYM" + i);
        }

        assertThrows(BadRequestException.class, () -> marketDataService.getQuotes(tooManySymbols));
        verifyNoInteractions(mockProvider);
    }

    @Test
    @DisplayName("getQuotes: Rejects empty symbols list")
    void testGetQuotes_EmptyList() {
        assertThrows(BadRequestException.class, () -> marketDataService.getQuotes(List.of()));
        assertThrows(BadRequestException.class, () -> marketDataService.getQuotes(null));
        verifyNoInteractions(mockProvider);
    }

    @Test
    @DisplayName("InMemoryMarketDataCache: Expired entry is evicted upon expiry")
    void testCache_TtlExpiration() throws InterruptedException {
        MarketDataCache shortTtlCache = new InMemoryMarketDataCache(Duration.ofMillis(50));
        MarketDataService shortService = new MarketDataServiceImpl(mockProvider, shortTtlCache);

        MarketQuoteDto quote = new MarketQuoteDto("NVDA", new BigDecimal("120.00"), BigDecimal.ZERO, BigDecimal.ZERO, Instant.now(), "OPEN");
        when(mockProvider.fetchQuote("NVDA")).thenReturn(quote);

        // Fetch quote, stores in short cache
        shortService.getQuote("NVDA");
        verify(mockProvider, times(1)).fetchQuote("NVDA");

        // Wait for TTL to expire
        Thread.sleep(70);

        // Fetch again, should trigger provider call again
        shortService.getQuote("NVDA");
        verify(mockProvider, times(2)).fetchQuote("NVDA");
    }

    @Test
    @DisplayName("search: Validates non-blank query and delegates to provider")
    void testSearch_DelegationAndValidation() {
        assertThrows(BadRequestException.class, () -> marketDataService.search(""));
        assertThrows(BadRequestException.class, () -> marketDataService.search("   "));
        assertThrows(BadRequestException.class, () -> marketDataService.search(null));

        when(mockProvider.search("Microsoft")).thenReturn(List.of(
                new MarketSearchResultDto("MSFT", "Microsoft Corp", "Common Stock", "NASDAQ")
        ));

        List<MarketSearchResultDto> results = marketDataService.search("  Microsoft  ");
        assertEquals(1, results.size());
        assertEquals("MSFT", results.get(0).getSymbol());
        verify(mockProvider, times(1)).search("Microsoft");
    }
}
