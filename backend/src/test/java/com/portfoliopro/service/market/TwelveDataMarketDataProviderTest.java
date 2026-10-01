package com.portfoliopro.service.market;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.portfoliopro.dto.market.MarketQuoteDto;
import com.portfoliopro.dto.market.MarketSearchResultDto;
import com.portfoliopro.exception.InvalidMarketDataException;
import com.portfoliopro.exception.MarketDataProviderUnavailableException;
import com.portfoliopro.exception.MarketDataTimeoutException;
import com.portfoliopro.exception.RateLimitExceededException;
import com.portfoliopro.exception.SymbolNotFoundException;
import com.portfoliopro.service.market.provider.TwelveDataMarketDataProvider;
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

class TwelveDataMarketDataProviderTest {

    private MockRestServiceServer mockServer;
    private TwelveDataMarketDataProvider provider;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        RestClient restClient = builder
                .baseUrl("https://api.twelvedata.com")
                .defaultHeader(org.springframework.http.HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();

        provider = new TwelveDataMarketDataProvider(
                "https://api.twelvedata.com",
                "test-twelve-data-key",
                3000,
                5000,
                restClient,
                objectMapper
        );
    }

    @Test
    @DisplayName("Twelve Data Requirement 11: Successful AAPL quote mapped to MarketQuoteDto")
    void testFetchQuote_Success_AAPL() {
        String twelveDataJson = """
            {
              "symbol": "AAPL",
              "name": "Apple Inc",
              "exchange": "NASDAQ",
              "mic_code": "XNAS",
              "currency": "USD",
              "datetime": "2026-09-29 10:00:00",
              "timestamp": 1790660000,
              "open": "224.50000",
              "high": "228.10000",
              "low": "223.90000",
              "close": "227.45000",
              "volume": "54231000",
              "previous_close": "225.50000",
              "change": "1.95000",
              "percent_change": "0.86475",
              "is_market_open": true
            }
            """;

        mockServer.expect(requestTo("https://api.twelvedata.com/quote?symbol=AAPL&apikey=test-twelve-data-key"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "apikey test-twelve-data-key"))
                .andRespond(withSuccess(twelveDataJson, MediaType.APPLICATION_JSON));

        MarketQuoteDto quote = provider.fetchQuote("AAPL");

        assertNotNull(quote);
        assertEquals("AAPL", quote.getSymbol());
        assertEquals(new BigDecimal("227.45"), quote.getPrice());
        assertEquals(new BigDecimal("1.95"), quote.getChange());
        assertEquals(new BigDecimal("0.86"), quote.getChangePercent());
        assertEquals("OPEN", quote.getMarketStatus());
        assertNotNull(quote.getTimestamp());
        mockServer.verify();
    }

    @Test
    @DisplayName("Twelve Data: Market status correctly reflects is_market_open = false")
    void testFetchQuote_ClosedMarket() {
        String twelveDataJson = """
            {
              "symbol": "MSFT",
              "close": "415.20",
              "change": "-2.10",
              "percent_change": "-0.50",
              "is_market_open": false,
              "timestamp": 1790660000
            }
            """;

        mockServer.expect(requestTo("https://api.twelvedata.com/quote?symbol=MSFT&apikey=test-twelve-data-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(twelveDataJson, MediaType.APPLICATION_JSON));

        MarketQuoteDto quote = provider.fetchQuote("MSFT");

        assertEquals("CLOSED", quote.getMarketStatus());
        assertEquals(new BigDecimal("415.20"), quote.getPrice());
        mockServer.verify();
    }

    @Test
    @DisplayName("Twelve Data Requirement 11: Malformed JSON response throws InvalidMarketDataException")
    void testFetchQuote_MalformedResponse() {
        mockServer.expect(requestTo("https://api.twelvedata.com/quote?symbol=AAPL&apikey=test-twelve-data-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("{not-valid-json", MediaType.APPLICATION_JSON));

        assertThrows(InvalidMarketDataException.class, () -> provider.fetchQuote("AAPL"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Twelve Data Requirement 11: Missing or null price throws InvalidMarketDataException")
    void testFetchQuote_MissingPrice() {
        String twelveDataMissingPrice = """
            {
              "symbol": "AAPL",
              "name": "Apple Inc",
              "change": "1.95",
              "percent_change": "0.86",
              "is_market_open": true
            }
            """;

        mockServer.expect(requestTo("https://api.twelvedata.com/quote?symbol=AAPL&apikey=test-twelve-data-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(twelveDataMissingPrice, MediaType.APPLICATION_JSON));

        InvalidMarketDataException ex = assertThrows(InvalidMarketDataException.class,
                () -> provider.fetchQuote("AAPL"));
        assertTrue(ex.getMessage().contains("missing valid close price"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Twelve Data Requirement 11: Invalid symbol (JSON error code 404/400) throws SymbolNotFoundException")
    void testFetchQuote_InvalidSymbol_JsonEnvelope() {
        String twelveDataErrorJson = """
            {
              "code": 404,
              "message": "symbol not found: INVALIDXYZ",
              "status": "error"
            }
            """;

        mockServer.expect(requestTo("https://api.twelvedata.com/quote?symbol=INVALIDXYZ&apikey=test-twelve-data-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(twelveDataErrorJson, MediaType.APPLICATION_JSON));

        SymbolNotFoundException ex = assertThrows(SymbolNotFoundException.class,
                () -> provider.fetchQuote("INVALIDXYZ"));
        assertTrue(ex.getMessage().contains("INVALIDXYZ"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Twelve Data Requirement 11: Invalid symbol (HTTP 404) throws SymbolNotFoundException")
    void testFetchQuote_InvalidSymbol_Http404() {
        mockServer.expect(requestTo("https://api.twelvedata.com/quote?symbol=NOTFOUND&apikey=test-twelve-data-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(MockRestResponseCreators.withStatus(HttpStatus.NOT_FOUND)
                        .body("{\"code\": 404, \"message\": \"Not found\", \"status\": \"error\"}"));

        assertThrows(SymbolNotFoundException.class, () -> provider.fetchQuote("NOTFOUND"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Twelve Data Requirement 11: Provider rate limit HTTP 429 throws RateLimitExceededException")
    void testFetchQuote_Provider429_Http() {
        mockServer.expect(requestTo("https://api.twelvedata.com/quote?symbol=TSLA&apikey=test-twelve-data-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(MockRestResponseCreators.withStatus(HttpStatus.TOO_MANY_REQUESTS)
                        .body("{\"code\": 429, \"message\": \"You have run out of API credits for today.\", \"status\": \"error\"}"));

        RateLimitExceededException ex = assertThrows(RateLimitExceededException.class,
                () -> provider.fetchQuote("TSLA"));
        assertTrue(ex.getMessage().contains("429"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Twelve Data Requirement 11: Provider rate limit JSON envelope (code 429) throws RateLimitExceededException")
    void testFetchQuote_Provider429_JsonEnvelope() {
        String rateLimitJson = """
            {
              "code": 429,
              "message": "You have reached your API call limit of 8 calls per minute.",
              "status": "error"
            }
            """;

        mockServer.expect(requestTo("https://api.twelvedata.com/quote?symbol=TSLA&apikey=test-twelve-data-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(rateLimitJson, MediaType.APPLICATION_JSON));

        RateLimitExceededException ex = assertThrows(RateLimitExceededException.class,
                () -> provider.fetchQuote("TSLA"));
        assertTrue(ex.getMessage().contains("rate limit exceeded"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Twelve Data Requirement 11: Provider 500 error throws MarketDataProviderUnavailableException")
    void testFetchQuote_Provider500() {
        mockServer.expect(requestTo("https://api.twelvedata.com/quote?symbol=NVDA&apikey=test-twelve-data-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withServerError().body("{\"code\": 500, \"message\": \"Internal Twelve Data outage\", \"status\": \"error\"}"));

        assertThrows(MarketDataProviderUnavailableException.class, () -> provider.fetchQuote("NVDA"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Twelve Data Requirement 11: Timeout throws MarketDataTimeoutException")
    void testFetchQuote_Timeout() {
        RestClient mockTimeoutClient = RestClient.builder()
                .requestFactory((uri, httpMethod) -> {
                    throw new ResourceAccessException("Socket timed out", new SocketTimeoutException("Read timed out"));
                })
                .build();

        TwelveDataMarketDataProvider timeoutProvider = new TwelveDataMarketDataProvider(
                "https://api.twelvedata.com",
                "test-twelve-data-key",
                100,
                100,
                mockTimeoutClient,
                objectMapper
        );

        assertThrows(MarketDataTimeoutException.class, () -> timeoutProvider.fetchQuote("AAPL"));
    }

    @Test
    @DisplayName("Twelve Data: Batch quote fetch maps multiple symbols correctly")
    void testFetchQuotes_Batch() {
        String batchJson = """
            {
              "AAPL": {
                "symbol": "AAPL",
                "close": "227.45",
                "change": "1.95",
                "percent_change": "0.86",
                "is_market_open": true
              },
              "MSFT": {
                "symbol": "MSFT",
                "close": "415.20",
                "change": "-2.10",
                "percent_change": "-0.50",
                "is_market_open": true
              }
            }
            """;

        mockServer.expect(requestTo("https://api.twelvedata.com/quote?symbol=AAPL,MSFT&apikey=test-twelve-data-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(batchJson, MediaType.APPLICATION_JSON));

        List<MarketQuoteDto> quotes = provider.fetchQuotes(List.of("AAPL", "MSFT"));

        assertEquals(2, quotes.size());
        assertTrue(quotes.stream().anyMatch(q -> q.getSymbol().equals("AAPL") && q.getPrice().equals(new BigDecimal("227.45"))));
        assertTrue(quotes.stream().anyMatch(q -> q.getSymbol().equals("MSFT") && q.getPrice().equals(new BigDecimal("415.20"))));
        mockServer.verify();
    }

    @Test
    @DisplayName("Twelve Data: /symbol_search maps results to MarketSearchResultDto")
    void testSearch_Success() {
        String searchJson = """
            {
              "data": [
                {
                  "symbol": "AAPL",
                  "instrument_name": "Apple Inc",
                  "exchange": "NASDAQ",
                  "mic_code": "XNAS",
                  "country": "United States",
                  "type": "Common Stock"
                }
              ],
              "status": "ok"
            }
            """;

        mockServer.expect(requestTo("https://api.twelvedata.com/symbol_search?symbol=Apple&apikey=test-twelve-data-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(searchJson, MediaType.APPLICATION_JSON));

        List<MarketSearchResultDto> results = provider.search("Apple");

        assertEquals(1, results.size());
        assertEquals("AAPL", results.get(0).getSymbol());
        assertEquals("Apple Inc", results.get(0).getDescription());
        assertEquals("NASDAQ", results.get(0).getExchange());
        assertEquals("Common Stock", results.get(0).getType());
        mockServer.verify();
    }
}
