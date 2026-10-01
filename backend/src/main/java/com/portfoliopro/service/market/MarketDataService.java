package com.portfoliopro.service.market;

import com.portfoliopro.dto.market.MarketQuoteDto;
import com.portfoliopro.dto.market.MarketSearchResultDto;

import java.util.List;

/**
 * High-level business service interface for market data.
 * Consumed by REST controllers and internal trading/portfolio services.
 * Orchestrates caching, symbol normalization, and provider delegation.
 */
public interface MarketDataService {

    /**
     * Gets current quote for a ticker symbol, checking cache before provider.
     *
     * @param symbol Ticker symbol (e.g. AAPL)
     * @return MarketQuoteDto
     */
    MarketQuoteDto getQuote(String symbol);

    /**
     * Gets current quotes for multiple ticker symbols, leveraging cache.
     *
     * @param symbols List of ticker symbols
     * @return List of MarketQuoteDtos
     */
    List<MarketQuoteDto> getQuotes(List<String> symbols);

    /**
     * Searches equities by ticker or company name.
     *
     * @param query Search term
     * @return List of matching results
     */
    List<MarketSearchResultDto> search(String query);
}
