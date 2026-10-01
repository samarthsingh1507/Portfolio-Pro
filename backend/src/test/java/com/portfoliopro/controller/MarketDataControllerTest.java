package com.portfoliopro.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.portfoliopro.dto.market.MarketQuoteDto;
import com.portfoliopro.dto.market.MarketSearchResultDto;
import com.portfoliopro.exception.MarketDataProviderUnavailableException;
import com.portfoliopro.exception.MarketDataTimeoutException;
import com.portfoliopro.exception.RateLimitExceededException;
import com.portfoliopro.exception.SymbolNotFoundException;
import com.portfoliopro.service.market.MarketDataService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "MARKET_DATA_API_KEY=test-key",
        "MARKET_DATA_BASE_URL=https://api.twelvedata.com",
        "market.data.provider=mock"
})
public class MarketDataControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MarketDataService marketDataService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("GET /api/market/quote/{symbol}: returns 200 with standard market quote format")
    public void testGetQuote_Success() throws Exception {
        MarketQuoteDto quote = new MarketQuoteDto(
                "AAPL",
                new BigDecimal("185.25"),
                new BigDecimal("2.50"),
                new BigDecimal("1.37"),
                Instant.parse("2026-09-29T10:00:00Z"),
                "OPEN"
        );

        when(marketDataService.getQuote("AAPL")).thenReturn(quote);

        mockMvc.perform(get("/api/market/quote/AAPL")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("AAPL"))
                .andExpect(jsonPath("$.price").value(185.25))
                .andExpect(jsonPath("$.change").value(2.50))
                .andExpect(jsonPath("$.changePercent").value(1.37))
                .andExpect(jsonPath("$.marketStatus").value("OPEN"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("GET /api/market/quote/{symbol}: returns 404 when symbol does not exist")
    public void testGetQuote_NotFound() throws Exception {
        when(marketDataService.getQuote("INVALID")).thenThrow(new SymbolNotFoundException("INVALID"));

        mockMvc.perform(get("/api/market/quote/INVALID")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("INVALID")));
    }

    @Test
    @DisplayName("GET /api/market/quote/{symbol}: returns 429 when rate limit is exceeded")
    public void testGetQuote_RateLimited() throws Exception {
        when(marketDataService.getQuote("TSLA")).thenThrow(new RateLimitExceededException("External provider rate limit reached"));

        mockMvc.perform(get("/api/market/quote/TSLA")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.message").value("External provider rate limit reached"));
    }

    @Test
    @DisplayName("GET /api/market/quote/{symbol}: returns 504 on provider timeout")
    public void testGetQuote_Timeout() throws Exception {
        when(marketDataService.getQuote("SLOW")).thenThrow(new MarketDataTimeoutException("Market data request timed out for symbol: SLOW"));

        mockMvc.perform(get("/api/market/quote/SLOW")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isGatewayTimeout())
                .andExpect(jsonPath("$.status").value(504))
                .andExpect(jsonPath("$.message").value("Market data request timed out for symbol: SLOW"));
    }

    @Test
    @DisplayName("GET /api/market/quote/{symbol}: returns 503 when provider is unavailable")
    public void testGetQuote_ProviderUnavailable() throws Exception {
        when(marketDataService.getQuote("NVDA")).thenThrow(new MarketDataProviderUnavailableException("Provider is down"));

        mockMvc.perform(get("/api/market/quote/NVDA")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503))
                .andExpect(jsonPath("$.message").value("Provider is down"));
    }

    @Test
    @DisplayName("GET /api/market/quotes?symbols=AAPL,MSFT: returns list of quotes")
    public void testGetQuotes_Batch() throws Exception {
        MarketQuoteDto q1 = new MarketQuoteDto("AAPL", new BigDecimal("185.00"), BigDecimal.ZERO, BigDecimal.ZERO, Instant.now(), "OPEN");
        MarketQuoteDto q2 = new MarketQuoteDto("MSFT", new BigDecimal("415.00"), BigDecimal.ZERO, BigDecimal.ZERO, Instant.now(), "OPEN");

        when(marketDataService.getQuotes(List.of("AAPL", "MSFT"))).thenReturn(List.of(q1, q2));

        mockMvc.perform(get("/api/market/quotes")
                        .param("symbols", "AAPL,MSFT")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].symbol").value("AAPL"))
                .andExpect(jsonPath("$[0].price").value(185.00))
                .andExpect(jsonPath("$[1].symbol").value("MSFT"))
                .andExpect(jsonPath("$[1].price").value(415.00));
    }

    @Test
    @DisplayName("GET /api/market/search?query=Tesla: returns search results")
    public void testSearch() throws Exception {
        MarketSearchResultDto r1 = new MarketSearchResultDto("TSLA", "Tesla Inc", "Common Stock", "NASDAQ");

        when(marketDataService.search("Tesla")).thenReturn(List.of(r1));

        mockMvc.perform(get("/api/market/search")
                        .param("query", "Tesla")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].symbol").value("TSLA"))
                .andExpect(jsonPath("$[0].description").value("Tesla Inc"))
                .andExpect(jsonPath("$[0].exchange").value("NASDAQ"));
    }
}
