package com.portfoliopro.service.market.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.portfoliopro.dto.market.MarketQuoteDto;
import com.portfoliopro.dto.market.MarketSearchResultDto;
import com.portfoliopro.exception.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.SocketTimeoutException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Production-ready HTTP implementation of MarketDataProvider.
 * Connects to external market data APIs via RestClient with configurable timeouts,
 * structured logging (zero secret leakage), and comprehensive error handling.
 */
@Component
public class HttpMarketDataProvider implements MarketDataProvider {

    private static final Logger log = LoggerFactory.getLogger(HttpMarketDataProvider.class);

    private final String baseUrl;
    private final String apiKey;
    private final int connectTimeoutMs;
    private final int readTimeoutMs;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Autowired
    public HttpMarketDataProvider(
            @Value("${market.data.base-url:https://api.marketdata.example.com}") String baseUrl,
            @Value("${market.data.api-key:}") String apiKey,
            @Value("${market.data.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${market.data.read-timeout-ms:5000}") int readTimeoutMs,
            @org.springframework.beans.factory.annotation.Autowired(required = false) RestClient.Builder restClientBuilder,
            @org.springframework.beans.factory.annotation.Autowired(required = false) ObjectMapper objectMapper) {
        this.baseUrl = baseUrl != null ? baseUrl.replaceAll("/+$", "") : "";
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.connectTimeoutMs = connectTimeoutMs;
        this.readTimeoutMs = readTimeoutMs;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(this.connectTimeoutMs);
        requestFactory.setReadTimeout(this.readTimeoutMs);

        RestClient.Builder builder = restClientBuilder != null ? restClientBuilder : RestClient.builder();
        this.restClient = builder
                .baseUrl(this.baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();

        log.info("Initialized HttpMarketDataProvider with baseUrl=[{}] connectTimeout={}ms readTimeout={}ms apiKeyConfigured={}",
                sanitizeUrl(this.baseUrl), this.connectTimeoutMs, this.readTimeoutMs, !this.apiKey.isEmpty());
    }

    // Secondary constructor for testing with custom RestClient
    public HttpMarketDataProvider(String baseUrl, String apiKey, int connectTimeoutMs, int readTimeoutMs, RestClient restClient, ObjectMapper objectMapper) {
        this.baseUrl = baseUrl != null ? baseUrl.replaceAll("/+$", "") : "";
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.connectTimeoutMs = connectTimeoutMs;
        this.readTimeoutMs = readTimeoutMs;
        this.restClient = restClient;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    @Override
    public MarketQuoteDto fetchQuote(String symbol) {
        if (symbol == null || symbol.trim().isEmpty()) {
            throw new SymbolNotFoundException("null/empty");
        }

        String normalizedSymbol = symbol.trim().toUpperCase();
        long startTime = System.currentTimeMillis();

        log.debug("Fetching market quote from external provider for symbol=[{}]", normalizedSymbol);

        try {
            String rawJson = restClient.get()
                    .uri(uriBuilder -> {
                        var builder = uriBuilder.path("/quote").queryParam("symbol", normalizedSymbol);
                        if (!apiKey.isEmpty()) {
                            builder.queryParam("token", apiKey);
                        }
                        return builder.build();
                    })
                    .header("X-API-KEY", apiKey.isEmpty() ? "" : apiKey)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, response) -> {
                        int statusCode = response.getStatusCode().value();
                        long duration = System.currentTimeMillis() - startTime;
                        log.warn("Market data provider returned error status=[{}] for symbol=[{}] duration={}ms",
                                statusCode, normalizedSymbol, duration);

                        if (statusCode == 429) {
                            throw new RateLimitExceededException("External market data provider rate limit exceeded (HTTP 429).");
                        } else if (statusCode == 404) {
                            throw new SymbolNotFoundException(normalizedSymbol);
                        } else if (statusCode >= 400 && statusCode < 500) {
                            throw new SymbolNotFoundException("Provider rejected symbol: " + normalizedSymbol + " (HTTP " + statusCode + ")");
                        } else {
                            throw new MarketDataProviderUnavailableException("External market data provider error (HTTP " + statusCode + ")");
                        }
                    })
                    .body(String.class);

            long duration = System.currentTimeMillis() - startTime;
            log.debug("Received market quote for symbol=[{}] in {}ms", normalizedSymbol, duration);

            return parseQuoteResponse(normalizedSymbol, rawJson);

        } catch (ResourceAccessException ex) {
            long duration = System.currentTimeMillis() - startTime;
            if (ex.getCause() instanceof SocketTimeoutException || ex.getMessage().toLowerCase().contains("timeout")) {
                log.error("Market data provider request timed out for symbol=[{}] after {}ms", normalizedSymbol, duration);
                throw new MarketDataTimeoutException("Market data request timed out for symbol: " + normalizedSymbol, ex);
            }
            log.error("Market data provider network connection failed for symbol=[{}] after {}ms: {}",
                    normalizedSymbol, duration, ex.getMessage());
            throw new MarketDataProviderUnavailableException("Market data provider is currently unavailable: " + ex.getMessage(), ex);

        } catch (RestClientResponseException ex) {
            int statusCode = ex.getStatusCode().value();
            if (statusCode == 429) {
                throw new RateLimitExceededException("External market data provider rate limit exceeded (HTTP 429).", ex);
            } else if (statusCode == 404) {
                throw new SymbolNotFoundException(normalizedSymbol);
            }
            throw new MarketDataProviderUnavailableException("Market data provider returned HTTP " + statusCode, ex);

        } catch (MarketDataException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error fetching market quote for symbol=[{}]: {}", normalizedSymbol, ex.getMessage());
            throw new MarketDataException("Unexpected error fetching market quote: " + ex.getMessage(), ex);
        }
    }

    @Override
    public List<MarketQuoteDto> fetchQuotes(List<String> symbols) {
        if (symbols == null || symbols.isEmpty()) {
            return List.of();
        }

        List<MarketQuoteDto> results = new ArrayList<>();
        for (String sym : symbols) {
            if (sym != null && !sym.trim().isEmpty()) {
                results.add(fetchQuote(sym));
            }
        }
        return results;
    }

    @Override
    public List<MarketSearchResultDto> search(String query) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }

        String trimmedQuery = query.trim();
        long startTime = System.currentTimeMillis();

        try {
            String rawJson = restClient.get()
                    .uri(uriBuilder -> {
                        var builder = uriBuilder.path("/search").queryParam("q", trimmedQuery);
                        if (!apiKey.isEmpty()) {
                            builder.queryParam("token", apiKey);
                        }
                        return builder.build();
                    })
                    .header("X-API-KEY", apiKey.isEmpty() ? "" : apiKey)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, response) -> {
                        int statusCode = response.getStatusCode().value();
                        if (statusCode == 429) {
                            throw new RateLimitExceededException("External market data search rate limit exceeded.");
                        }
                        throw new MarketDataProviderUnavailableException("Market data search provider returned HTTP " + statusCode);
                    })
                    .body(String.class);

            return parseSearchResponse(rawJson);

        } catch (ResourceAccessException ex) {
            if (ex.getCause() instanceof SocketTimeoutException || ex.getMessage().toLowerCase().contains("timeout")) {
                throw new MarketDataTimeoutException("Market data search request timed out for query: " + trimmedQuery, ex);
            }
            throw new MarketDataProviderUnavailableException("Market data search provider is unavailable", ex);
        } catch (MarketDataException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error searching market data for query=[{}]: {}", trimmedQuery, ex.getMessage());
            throw new MarketDataException("Market data search failed: " + ex.getMessage(), ex);
        }
    }

    /**
     * Parses JSON response from market data provider into standardized MarketQuoteDto.
     * Supports both standard key formats (price, change, changePercent) and compact formats (c, d, dp, t).
     * Validates that price data is present and non-null.
     */
    private MarketQuoteDto parseQuoteResponse(String symbol, String rawJson) {
        if (rawJson == null || rawJson.trim().isEmpty()) {
            throw new InvalidMarketDataException("Received empty response from market data provider for symbol: " + symbol);
        }

        try {
            JsonNode root = objectMapper.readTree(rawJson);

            // Extract price from 'price' or 'c' (current price) or 'lastPrice'
            BigDecimal price = null;
            if (root.hasNonNull("price")) {
                price = new BigDecimal(root.get("price").asText());
            } else if (root.hasNonNull("c")) {
                price = new BigDecimal(root.get("c").asText());
            } else if (root.hasNonNull("lastPrice")) {
                price = new BigDecimal(root.get("lastPrice").asText());
            }

            if (price == null || price.compareTo(BigDecimal.ZERO) < 0) {
                log.warn("Market data response for symbol=[{}] missing or null price: rawJson={}", symbol, rawJson);
                throw new InvalidMarketDataException("Market data provider response for symbol [" + symbol + "] missing valid price");
            }
            price = price.setScale(2, RoundingMode.HALF_UP);

            // Extract change
            BigDecimal change = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            if (root.hasNonNull("change")) {
                change = new BigDecimal(root.get("change").asText()).setScale(2, RoundingMode.HALF_UP);
            } else if (root.hasNonNull("d")) {
                change = new BigDecimal(root.get("d").asText()).setScale(2, RoundingMode.HALF_UP);
            }

            // Extract changePercent
            BigDecimal changePercent = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            if (root.hasNonNull("changePercent")) {
                changePercent = new BigDecimal(root.get("changePercent").asText()).setScale(2, RoundingMode.HALF_UP);
            } else if (root.hasNonNull("dp")) {
                changePercent = new BigDecimal(root.get("dp").asText()).setScale(2, RoundingMode.HALF_UP);
            }

            // Extract timestamp
            Instant timestamp = Instant.now();
            if (root.hasNonNull("timestamp")) {
                try {
                    timestamp = Instant.parse(root.get("timestamp").asText());
                } catch (Exception ignored) {
                    // Fall back to epoch seconds or now
                    if (root.get("timestamp").isNumber()) {
                        timestamp = Instant.ofEpochMilli(root.get("timestamp").asLong());
                    }
                }
            } else if (root.hasNonNull("t") && root.get("t").isNumber()) {
                timestamp = Instant.ofEpochSecond(root.get("t").asLong());
            }

            // Extract or determine marketStatus
            String marketStatus = "OPEN";
            if (root.hasNonNull("marketStatus")) {
                marketStatus = root.get("marketStatus").asText().toUpperCase();
            }

            return new MarketQuoteDto(
                    symbol,
                    price,
                    change,
                    changePercent,
                    timestamp,
                    marketStatus
            );

        } catch (InvalidMarketDataException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to parse market quote JSON for symbol=[{}]: {}", symbol, ex.getMessage());
            throw new InvalidMarketDataException("Malformed market data provider response: " + ex.getMessage(), ex);
        }
    }

    private List<MarketSearchResultDto> parseSearchResponse(String rawJson) {
        List<MarketSearchResultDto> results = new ArrayList<>();
        if (rawJson == null || rawJson.trim().isEmpty()) {
            return results;
        }

        try {
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode itemsNode = root.isArray() ? root : (root.has("result") ? root.get("result") : root.get("data"));

            if (itemsNode != null && itemsNode.isArray()) {
                for (JsonNode item : itemsNode) {
                    String sym = item.hasNonNull("symbol") ? item.get("symbol").asText() : "";
                    String desc = item.hasNonNull("description") ? item.get("description").asText() : (item.hasNonNull("companyName") ? item.get("companyName").asText() : "");
                    String type = item.hasNonNull("type") ? item.get("type").asText() : "Common Stock";
                    String exchange = item.hasNonNull("exchange") ? item.get("exchange").asText() : "US";

                    if (!sym.isEmpty()) {
                        results.add(new MarketSearchResultDto(sym, desc, type, exchange));
                    }
                }
            }
            return results;
        } catch (Exception ex) {
            log.error("Failed to parse market search JSON: {}", ex.getMessage());
            throw new InvalidMarketDataException("Malformed search response from market data provider", ex);
        }
    }

    /**
     * Sanitizes URLs for logging by stripping query parameter values.
     */
    private String sanitizeUrl(String url) {
        if (url == null) return "";
        return url.replaceAll("(?i)(token|key|api_key|apikey)=[^&]+", "$1=***");
    }
}
