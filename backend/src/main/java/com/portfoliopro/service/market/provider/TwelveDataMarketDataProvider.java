package com.portfoliopro.service.market.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.portfoliopro.dto.market.MarketQuoteDto;
import com.portfoliopro.dto.market.MarketSearchResultDto;
import com.portfoliopro.exception.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * Production-ready Twelve Data implementation of MarketDataProvider.
 * Connects to Twelve Data (https://api.twelvedata.com) via RestClient.
 * Strictly maps Twelve Data fields to internal MarketQuoteDto without exposing
 * Twelve Data structures to controllers or the frontend.
 * Redacts credentials in logs and maps HTTP/JSON error formats to domain exceptions.
 */
@Component
@Primary
public class TwelveDataMarketDataProvider implements MarketDataProvider {

    private static final Logger log = LoggerFactory.getLogger(TwelveDataMarketDataProvider.class);

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final String baseUrl;
    private final String apiKey;
    private final int connectTimeoutMs;
    private final int readTimeoutMs;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Autowired
    public TwelveDataMarketDataProvider(
            @Value("${market.data.base-url:https://api.twelvedata.com}") String baseUrl,
            @Value("${market.data.api-key:}") String apiKey,
            @Value("${market.data.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${market.data.read-timeout-ms:5000}") int readTimeoutMs,
            @Autowired(required = false) RestClient.Builder restClientBuilder,
            @Autowired(required = false) ObjectMapper objectMapper) {
        this.baseUrl = (baseUrl != null && !baseUrl.trim().isEmpty())
                ? baseUrl.trim().replaceAll("/+$", "")
                : "https://api.twelvedata.com";
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

        log.info("Initialized TwelveDataMarketDataProvider with baseUrl=[{}] connectTimeout={}ms readTimeout={}ms apiKeyConfigured={}",
                sanitizeUrl(this.baseUrl), this.connectTimeoutMs, this.readTimeoutMs, !this.apiKey.isEmpty());
    }

    // Constructor for testing with mocked RestClient
    public TwelveDataMarketDataProvider(String baseUrl, String apiKey, int connectTimeoutMs, int readTimeoutMs, RestClient restClient, ObjectMapper objectMapper) {
        this.baseUrl = (baseUrl != null && !baseUrl.trim().isEmpty())
                ? baseUrl.trim().replaceAll("/+$", "")
                : "https://api.twelvedata.com";
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

        log.debug("Fetching quote from Twelve Data for symbol=[{}]", normalizedSymbol);

        try {
            String rawJson = restClient.get()
                    .uri(uriBuilder -> {
                        var builder = uriBuilder.path("/quote").queryParam("symbol", normalizedSymbol);
                        if (!apiKey.isEmpty()) {
                            builder.queryParam("apikey", apiKey);
                        }
                        return builder.build();
                    })
                    .header("Authorization", apiKey.isEmpty() ? "" : "apikey " + apiKey)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, response) -> {
                        int statusCode = response.getStatusCode().value();
                        long duration = System.currentTimeMillis() - startTime;
                        log.warn("Twelve Data provider returned error HTTP status=[{}] for symbol=[{}] duration={}ms",
                                statusCode, normalizedSymbol, duration);

                        if (statusCode == 429) {
                            throw new RateLimitExceededException("Twelve Data rate limit exceeded (HTTP 429).");
                        } else if (statusCode == 401 || statusCode == 403) {
                            throw new MarketDataProviderUnavailableException("Twelve Data authentication failed (HTTP " + statusCode + "). Verify MARKET_DATA_API_KEY.");
                        } else if (statusCode == 404) {
                            throw new SymbolNotFoundException(normalizedSymbol);
                        } else if (statusCode >= 400 && statusCode < 500) {
                            throw new SymbolNotFoundException("Twelve Data rejected symbol: " + normalizedSymbol + " (HTTP " + statusCode + ")");
                        } else {
                            throw new MarketDataProviderUnavailableException("Twelve Data provider error (HTTP " + statusCode + ")");
                        }
                    })
                    .body(String.class);

            long duration = System.currentTimeMillis() - startTime;
            log.debug("Received Twelve Data quote for symbol=[{}] in {}ms", normalizedSymbol, duration);

            return parseTwelveDataQuote(normalizedSymbol, rawJson);

        } catch (ResourceAccessException ex) {
            long duration = System.currentTimeMillis() - startTime;
            if (ex.getCause() instanceof SocketTimeoutException || (ex.getMessage() != null && ex.getMessage().toLowerCase().contains("timeout"))) {
                log.error("Twelve Data request timed out for symbol=[{}] after {}ms", normalizedSymbol, duration);
                throw new MarketDataTimeoutException("Market data request timed out for symbol: " + normalizedSymbol, ex);
            }
            log.error("Twelve Data connection failed for symbol=[{}] after {}ms: {}",
                    normalizedSymbol, duration, ex.getMessage());
            throw new MarketDataProviderUnavailableException("Twelve Data provider is currently unavailable: " + ex.getMessage(), ex);

        } catch (RestClientResponseException ex) {
            int statusCode = ex.getStatusCode().value();
            if (statusCode == 429) {
                throw new RateLimitExceededException("Twelve Data rate limit exceeded (HTTP 429).", ex);
            } else if (statusCode == 404) {
                throw new SymbolNotFoundException(normalizedSymbol);
            }
            throw new MarketDataProviderUnavailableException("Twelve Data returned HTTP " + statusCode, ex);

        } catch (MarketDataException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error fetching Twelve Data quote for symbol=[{}]: {}", normalizedSymbol, ex.getMessage());
            throw new MarketDataException("Unexpected error fetching market quote: " + ex.getMessage(), ex);
        }
    }

    @Override
    public List<MarketQuoteDto> fetchQuotes(List<String> symbols) {
        if (symbols == null || symbols.isEmpty()) {
            return List.of();
        }

        List<String> normalizedList = symbols.stream()
                .filter(s -> s != null && !s.trim().isEmpty())
                .map(String::trim)
                .map(String::toUpperCase)
                .distinct()
                .toList();

        if (normalizedList.isEmpty()) {
            return List.of();
        }

        // For a single symbol, delegate to single fetch
        if (normalizedList.size() == 1) {
            return List.of(fetchQuote(normalizedList.get(0)));
        }

        List<MarketQuoteDto> allResults = new ArrayList<>();
        int batchSize = 8;

        for (int i = 0; i < normalizedList.size(); i += batchSize) {
            List<String> subList = normalizedList.subList(i, Math.min(i + batchSize, normalizedList.size()));
            String joinedSymbols = String.join(",", subList);

            try {
                String rawJson = restClient.get()
                        .uri(uriBuilder -> {
                            var builder = uriBuilder.path("/quote").queryParam("symbol", joinedSymbols);
                            if (!apiKey.isEmpty()) {
                                builder.queryParam("apikey", apiKey);
                            }
                            return builder.build();
                        })
                        .header("Authorization", apiKey.isEmpty() ? "" : "apikey " + apiKey)
                        .retrieve()
                        .onStatus(HttpStatusCode::isError, (request, response) -> {
                            int statusCode = response.getStatusCode().value();
                            if (statusCode == 429) {
                                throw new RateLimitExceededException("Twelve Data rate limit exceeded on batch request (HTTP 429).");
                            } else if (statusCode == 401 || statusCode == 403) {
                                throw new MarketDataProviderUnavailableException("Twelve Data authentication failed (HTTP " + statusCode + "). Verify MARKET_DATA_API_KEY.");
                            }
                            throw new MarketDataProviderUnavailableException("Twelve Data batch error (HTTP " + statusCode + ")");
                        })
                        .body(String.class);

                allResults.addAll(parseTwelveDataBatchQuotes(subList, rawJson));

            } catch (RateLimitExceededException ex) {
                log.warn("Rate limit on batch chunk [{}], returning partial results", joinedSymbols);
                break;
            } catch (Exception ex) {
                log.warn("Batch quote chunk failed for [{}]: {}", joinedSymbols, ex.getMessage());
                for (String sym : subList) {
                    try {
                        allResults.add(fetchQuote(sym));
                    } catch (Exception ignored) {}
                }
            }
        }

        return allResults;
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
                        var builder = uriBuilder.path("/symbol_search").queryParam("symbol", trimmedQuery);
                        if (!apiKey.isEmpty()) {
                            builder.queryParam("apikey", apiKey);
                        }
                        return builder.build();
                    })
                    .header("Authorization", apiKey.isEmpty() ? "" : "apikey " + apiKey)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, response) -> {
                        int statusCode = response.getStatusCode().value();
                        if (statusCode == 429) {
                            throw new RateLimitExceededException("Twelve Data search rate limit exceeded (HTTP 429).");
                        } else if (statusCode == 401 || statusCode == 403) {
                            throw new MarketDataProviderUnavailableException("Twelve Data authentication failed (HTTP " + statusCode + "). Verify MARKET_DATA_API_KEY.");
                        }
                        throw new MarketDataProviderUnavailableException("Twelve Data search error (HTTP " + statusCode + ")");
                    })
                    .body(String.class);

            return parseTwelveDataSearch(rawJson);

        } catch (ResourceAccessException ex) {
            if (ex.getCause() instanceof SocketTimeoutException || (ex.getMessage() != null && ex.getMessage().toLowerCase().contains("timeout"))) {
                throw new MarketDataTimeoutException("Twelve Data search timed out for query: " + trimmedQuery, ex);
            }
            throw new MarketDataProviderUnavailableException("Twelve Data search provider unavailable", ex);
        } catch (MarketDataException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error in Twelve Data search for query=[{}]: {}", trimmedQuery, ex.getMessage());
            throw new MarketDataException("Twelve Data search failed: " + ex.getMessage(), ex);
        }
    }

    /**
     * Maps Twelve Data single quote JSON to standard MarketQuoteDto.
     * Evaluates Twelve Data error envelopes (e.g. {"status":"error", "code":404, "message":"..."}),
     * and strictly extracts: symbol, close -> price, change, percent_change, timestamp/datetime, is_market_open.
     */
    private MarketQuoteDto parseTwelveDataQuote(String requestedSymbol, String rawJson) {
        if (rawJson == null || rawJson.trim().isEmpty()) {
            throw new InvalidMarketDataException("Received empty response from Twelve Data for symbol: " + requestedSymbol);
        }

        try {
            JsonNode root = objectMapper.readTree(rawJson);
            checkTwelveDataErrorEnvelope(requestedSymbol, root);

            return mapSingleNodeToQuote(requestedSymbol, root);

        } catch (MarketDataException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to parse Twelve Data quote JSON for symbol=[{}]: {}", requestedSymbol, ex.getMessage());
            throw new InvalidMarketDataException("Malformed Twelve Data quote response: " + ex.getMessage(), ex);
        }
    }

    /**
     * Parses Twelve Data batch quote JSON where response is a map of symbol -> quote object.
     */
    private List<MarketQuoteDto> parseTwelveDataBatchQuotes(List<String> requestedSymbols, String rawJson) {
        List<MarketQuoteDto> results = new ArrayList<>();
        if (rawJson == null || rawJson.trim().isEmpty()) {
            return results;
        }

        try {
            JsonNode root = objectMapper.readTree(rawJson);
            checkTwelveDataErrorEnvelope("BATCH", root);

            // If response is a single quote object
            if (root.hasNonNull("symbol") && (root.hasNonNull("close") || root.hasNonNull("price"))) {
                results.add(mapSingleNodeToQuote(root.get("symbol").asText(), root));
                return results;
            }

            // If response is a map of symbol -> quote object
            Iterator<Map.Entry<String, JsonNode>> fields = root.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                String sym = entry.getKey();
                JsonNode quoteNode = entry.getValue();

                if (quoteNode.isObject() && quoteNode.hasNonNull("close")) {
                    try {
                        results.add(mapSingleNodeToQuote(sym, quoteNode));
                    } catch (Exception ex) {
                        log.warn("Skipping unparseable batch symbol quote for [{}]: {}", sym, ex.getMessage());
                    }
                }
            }

            return results;
        } catch (MarketDataException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to parse Twelve Data batch quotes JSON: {}", ex.getMessage());
            throw new InvalidMarketDataException("Malformed Twelve Data batch quote response", ex);
        }
    }

    /**
     * Maps an individual Twelve Data JSON node to internal MarketQuoteDto.
     * Twelve Data fields:
     * - symbol -> symbol
     * - close -> price
     * - change -> change
     * - percent_change -> changePercent
     * - timestamp / datetime -> timestamp
     * - is_market_open -> marketStatus ("OPEN" / "CLOSED")
     */
    private MarketQuoteDto mapSingleNodeToQuote(String fallbackSymbol, JsonNode node) {
        // 1. Symbol
        String symbol = node.hasNonNull("symbol") ? node.get("symbol").asText().toUpperCase() : fallbackSymbol;

        // 2. Price (mapped from Twelve Data 'close')
        BigDecimal price = null;
        if (node.hasNonNull("close")) {
            try {
                price = new BigDecimal(node.get("close").asText().trim());
            } catch (Exception ignored) {}
        } else if (node.hasNonNull("price")) {
            try {
                price = new BigDecimal(node.get("price").asText().trim());
            } catch (Exception ignored) {}
        }

        if (price == null || price.compareTo(BigDecimal.ZERO) < 0) {
            log.warn("Twelve Data response for symbol=[{}] missing or invalid 'close' price", symbol);
            throw new InvalidMarketDataException("Twelve Data response for symbol [" + symbol + "] is missing valid close price");
        }
        price = price.setScale(2, RoundingMode.HALF_UP);

        // 3. Change (mapped from Twelve Data 'change')
        BigDecimal change = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        if (node.hasNonNull("change")) {
            try {
                change = new BigDecimal(node.get("change").asText().trim()).setScale(2, RoundingMode.HALF_UP);
            } catch (Exception ignored) {}
        }

        // 4. ChangePercent (mapped from Twelve Data 'percent_change')
        BigDecimal changePercent = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        if (node.hasNonNull("percent_change")) {
            try {
                changePercent = new BigDecimal(node.get("percent_change").asText().trim()).setScale(2, RoundingMode.HALF_UP);
            } catch (Exception ignored) {}
        }

        // 5. Timestamp (mapped from Twelve Data 'timestamp' or 'datetime')
        Instant timestamp = parseTimestamp(node);

        // 6. MarketStatus (mapped from Twelve Data 'is_market_open')
        String marketStatus = "OPEN";
        if (node.hasNonNull("is_market_open")) {
            marketStatus = node.get("is_market_open").asBoolean() ? "OPEN" : "CLOSED";
        } else if (node.hasNonNull("marketStatus")) {
            marketStatus = node.get("marketStatus").asText().toUpperCase();
        }

        return new MarketQuoteDto(symbol, price, change, changePercent, timestamp, marketStatus);
    }

    private Instant parseTimestamp(JsonNode node) {
        if (node.hasNonNull("timestamp") && node.get("timestamp").isNumber()) {
            return Instant.ofEpochSecond(node.get("timestamp").asLong());
        }

        if (node.hasNonNull("datetime")) {
            String dtStr = node.get("datetime").asText().trim();
            try {
                if (dtStr.length() == 10) { // yyyy-MM-dd
                    return LocalDate.parse(dtStr, DATE_FORMATTER).atStartOfDay().toInstant(ZoneOffset.UTC);
                } else if (dtStr.contains(" ")) { // yyyy-MM-dd HH:mm:ss
                    return LocalDateTime.parse(dtStr, DATE_TIME_FORMATTER).toInstant(ZoneOffset.UTC);
                } else {
                    return Instant.parse(dtStr);
                }
            } catch (Exception ignored) {}
        }

        return Instant.now();
    }

    /**
     * Inspects Twelve Data JSON payloads for error envelopes:
     * e.g. {"status": "error", "code": 404, "message": "Cannot find symbol..."}
     */
    private void checkTwelveDataErrorEnvelope(String symbol, JsonNode root) {
        if (root.has("status") && "error".equalsIgnoreCase(root.get("status").asText())) {
            int code = root.hasNonNull("code") ? root.get("code").asInt() : 400;
            String message = root.hasNonNull("message") ? root.get("message").asText() : "Twelve Data error";

            log.warn("Twelve Data API error envelope received for symbol=[{}]: code={} message={}",
                    symbol, code, message);

            if (code == 429 || message.toLowerCase().contains("limit") || message.toLowerCase().contains("credits")) {
                throw new RateLimitExceededException("Twelve Data API rate limit exceeded: " + message);
            } else if (code == 404 || code == 400 || message.toLowerCase().contains("not found") || message.toLowerCase().contains("invalid symbol")) {
                throw new SymbolNotFoundException("Twelve Data symbol not found or invalid: " + symbol + " (" + message + ")");
            } else if (code == 401 || code == 403) {
                throw new MarketDataProviderUnavailableException("Twelve Data authentication failed (verify MARKET_DATA_API_KEY): " + message);
            } else if (code >= 500) {
                throw new MarketDataProviderUnavailableException("Twelve Data service error (HTTP " + code + "): " + message);
            } else {
                throw new InvalidMarketDataException("Twelve Data error: " + message);
            }
        }
    }

    private List<MarketSearchResultDto> parseTwelveDataSearch(String rawJson) {
        List<MarketSearchResultDto> results = new ArrayList<>();
        if (rawJson == null || rawJson.trim().isEmpty()) {
            return results;
        }

        try {
            JsonNode root = objectMapper.readTree(rawJson);
            checkTwelveDataErrorEnvelope("SEARCH", root);

            JsonNode dataNode = root.has("data") ? root.get("data") : root;
            if (dataNode != null && dataNode.isArray()) {
                for (JsonNode item : dataNode) {
                    String sym = item.hasNonNull("symbol") ? item.get("symbol").asText() : "";
                    String desc = item.hasNonNull("instrument_name")
                            ? item.get("instrument_name").asText()
                            : (item.hasNonNull("name") ? item.get("name").asText() : "");
                    String type = item.hasNonNull("type") ? item.get("type").asText() : "Common Stock";
                    String exchange = item.hasNonNull("exchange") ? item.get("exchange").asText() : "US";

                    if (!sym.isEmpty()) {
                        results.add(new MarketSearchResultDto(sym, desc, type, exchange));
                    }
                }
            }
            return results;
        } catch (MarketDataException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to parse Twelve Data search JSON: {}", ex.getMessage());
            throw new InvalidMarketDataException("Malformed search response from Twelve Data", ex);
        }
    }

    /**
     * Sanitizes URLs for logging by stripping apikey/api_key/token parameter values.
     */
    private String sanitizeUrl(String url) {
        if (url == null) return "";
        return url.replaceAll("(?i)(apikey|api_key|token)=[^&]+", "$1=***");
    }
}
