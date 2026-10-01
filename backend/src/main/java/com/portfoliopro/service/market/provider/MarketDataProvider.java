package com.portfoliopro.service.market.provider;

import com.portfoliopro.dto.market.MarketQuoteDto;
import com.portfoliopro.dto.market.MarketSearchResultDto;

import java.util.List;

/**
 * Pluggable provider interface for external market data sources.
 * Implementations isolate provider-specific protocols, endpoints, and response parsing.
 */
public interface MarketDataProvider {

    /**
     * Fetches a real-time market quote for a single symbol.
     *
     * @param symbol Ticker symbol (e.g., AAPL)
     * @return Standardized MarketQuoteDto
     */
    MarketQuoteDto fetchQuote(String symbol);

    /**
     * Fetches real-time market quotes for multiple symbols in batch.
     *
     * @param symbols List of ticker symbols
     * @return List of standardized MarketQuoteDtos
     */
    List<MarketQuoteDto> fetchQuotes(List<String> symbols);

    /**
     * Searches the market data provider for matching tickers and companies.
     *
     * @param query Search query string
     * @return List of matching results
     */
    List<MarketSearchResultDto> search(String query);
}
