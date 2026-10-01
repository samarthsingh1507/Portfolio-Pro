package com.portfoliopro.service.market;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.portfoliopro.dto.market.MarketQuoteDto;
import com.portfoliopro.dto.market.MarketSearchResultDto;
import com.portfoliopro.exception.InvalidMarketDataException;
import com.portfoliopro.exception.MarketDataProviderUnavailableException;
import com.portfoliopro.exception.MarketDataTimeoutException;
import com.portfoliopro.exception.RateLimitExceededException;
import com.portfoliopro.exception.SymbolNotFoundException;
import com.portfoliopro.service.market.provider.HttpMarketDataProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.response.MockRestResponseCreators;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.net.SocketTimeoutException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class HttpMarketDataProviderTest {

    private MockRestServiceServer mockServer;
    private HttpMarketDataProvider provider;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        RestClient restClient = builder
                .baseUrl("https://api.marketdata.example.com")
                .defaultHeader(org.springframework.http.HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
        provider = new HttpMarketDataProvider(
                "https://api.marketdata.example.com",
                "test-api-key",
                3000,
                5000,
                restClient,
                objectMapper
        );
    }

    @Test
    @DisplayName("Requirement 15: Successful response parses price, change, changePercent, timestamp, and status")
    void testFetchQuote_Success() {
        String json = """
            {
              "symbol": "AAPL",
              "price": 182.50,
              "change": 1.25,
              "changePercent": 0.69,
              "timestamp": "2026-09-29T10:00:00Z",
              "marketStatus": "OPEN"
            }
            """;

        mockServer.expect(requestTo("https://api.marketdata.example.com/quote?symbol=AAPL&token=test-api-key"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("X-API-KEY", "test-api-key"))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        MarketQuoteDto quote = provider.fetchQuote("AAPL");

        assertNotNull(quote);
        assertEquals("AAPL", quote.getSymbol());
        assertEquals(new BigDecimal("182.50"), quote.getPrice());
        assertEquals(new BigDecimal("1.25"), quote.getChange());
        assertEquals(new BigDecimal("0.69"), quote.getChangePercent());
        assertEquals("OPEN", quote.getMarketStatus());
        assertNotNull(quote.getTimestamp());
        mockServer.verify();
    }

    @Test
    @DisplayName("Requirement 15: Successful response supporting compact quote format (c, d, dp, t)")
    void testFetchQuote_CompactFormat_Success() {
        String json = """
            {
              "c": 250.75,
              "d": -3.20,
              "dp": -1.26,
              "t": 1727600000
            }
            """;

        mockServer.expect(requestTo("https://api.marketdata.example.com/quote?symbol=MSFT&token=test-api-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        MarketQuoteDto quote = provider.fetchQuote("MSFT");

        assertNotNull(quote);
        assertEquals("MSFT", quote.getSymbol());
        assertEquals(new BigDecimal("250.75"), quote.getPrice());
        assertEquals(new BigDecimal("-3.20"), quote.getChange());
        assertEquals(new BigDecimal("-1.26"), quote.getChangePercent());
        assertEquals("OPEN", quote.getMarketStatus());
        mockServer.verify();
    }

    @Test
    @DisplayName("Requirement 15: Timeout throws MarketDataTimeoutException")
    void testFetchQuote_Timeout() {
        // Create provider using custom client that triggers timeout
        RestClient mockRestClient = RestClient.builder()
                .requestFactory((uri, httpMethod) -> {
                    throw new ResourceAccessException("I/O error: Read timed out", new SocketTimeoutException("Read timed out"));
                })
                .build();

        HttpMarketDataProvider timeoutProvider = new HttpMarketDataProvider(
                "https://api.marketdata.example.com",
                "test-api-key",
                100,
                100,
                mockRestClient,
                objectMapper
        );

        assertThrows(MarketDataTimeoutException.class, () -> timeoutProvider.fetchQuote("AAPL"));
    }

    @Test
    @DisplayName("Requirement 15: HTTP 429 response throws RateLimitExceededException")
    void testFetchQuote_RateLimit429() {
        mockServer.expect(requestTo("https://api.marketdata.example.com/quote?symbol=TSLA&token=test-api-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(MockRestResponseCreators.withStatus(HttpStatus.TOO_MANY_REQUESTS)
                        .body("{\"error\": \"Rate limit exceeded\"}")
                        .contentType(MediaType.APPLICATION_JSON));

        RateLimitExceededException ex = assertThrows(RateLimitExceededException.class,
                () -> provider.fetchQuote("TSLA"));
        assertTrue(ex.getMessage().contains("429"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Requirement 15: Provider failure (HTTP 500/503) throws MarketDataProviderUnavailableException")
    void testFetchQuote_ProviderFailure5xx() {
        mockServer.expect(requestTo("https://api.marketdata.example.com/quote?symbol=NVDA&token=test-api-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withServerError().body("{\"error\": \"Internal provider fault\"}"));

        assertThrows(MarketDataProviderUnavailableException.class, () -> provider.fetchQuote("NVDA"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Requirement 15: Invalid symbol (HTTP 404) throws SymbolNotFoundException")
    void testFetchQuote_InvalidSymbol404() {
        mockServer.expect(requestTo("https://api.marketdata.example.com/quote?symbol=UNKNOWN&token=test-api-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(MockRestResponseCreators.withStatus(HttpStatus.NOT_FOUND)
                        .body("{\"error\": \"Symbol not found\"}"));

        SymbolNotFoundException ex = assertThrows(SymbolNotFoundException.class,
                () -> provider.fetchQuote("UNKNOWN"));
        assertTrue(ex.getMessage().contains("UNKNOWN"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Requirement 15: Null / missing price in response throws InvalidMarketDataException")
    void testFetchQuote_NullOrMissingPrice() {
        String jsonWithoutPrice = """
            {
              "symbol": "GOOGL",
              "change": 0.50,
              "changePercent": 0.20
            }
            """;

        mockServer.expect(requestTo("https://api.marketdata.example.com/quote?symbol=GOOGL&token=test-api-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(jsonWithoutPrice, MediaType.APPLICATION_JSON));

        InvalidMarketDataException ex = assertThrows(InvalidMarketDataException.class,
                () -> provider.fetchQuote("GOOGL"));
        assertTrue(ex.getMessage().contains("missing valid price"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Requirement 8: Malformed JSON response throws InvalidMarketDataException")
    void testFetchQuote_MalformedJson() {
        mockServer.expect(requestTo("https://api.marketdata.example.com/quote?symbol=AMZN&token=test-api-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("{not-valid-json", MediaType.APPLICATION_JSON));

        assertThrows(InvalidMarketDataException.class, () -> provider.fetchQuote("AMZN"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Search query parsing returns matching items")
    void testSearch_Success() {
        String searchJson = """
            {
              "result": [
                {
                  "symbol": "AAPL",
                  "description": "Apple Inc",
                  "type": "Common Stock",
                  "exchange": "NASDAQ"
                },
                {
                  "symbol": "APLE",
                  "description": "Apple Hospitality REIT",
                  "type": "REIT",
                  "exchange": "NYSE"
                }
              ]
            }
            """;

        mockServer.expect(requestTo("https://api.marketdata.example.com/search?q=Apple&token=test-api-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(searchJson, MediaType.APPLICATION_JSON));

        List<MarketSearchResultDto> results = provider.search("Apple");

        assertEquals(2, results.size());
        assertEquals("AAPL", results.get(0).getSymbol());
        assertEquals("Apple Inc", results.get(0).getDescription());
        assertEquals("APLE", results.get(1).getSymbol());
        mockServer.verify();
    }
}
