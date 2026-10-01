package com.portfoliopro.controller;

import com.portfoliopro.dto.market.MarketQuoteDto;
import com.portfoliopro.dto.market.MarketSearchResultDto;
import com.portfoliopro.exception.BadRequestException;
import com.portfoliopro.service.market.MarketDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/market")
public class MarketDataController {

    private final MarketDataService marketDataService;

    public MarketDataController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    /**
     * Retrieves real-time quote for a specific ticker symbol.
     * GET /api/market/quote/{symbol}
     */
    @GetMapping(value = {"/quote/{symbol}", "/quote/{symbol1}/{symbol2}"})
    public ResponseEntity<MarketQuoteDto> getQuote(@PathVariable(required = false) String symbol,
                                                  @PathVariable(required = false) String symbol1,
                                                  @PathVariable(required = false) String symbol2) {
        String targetSymbol = symbol;
        if (targetSymbol == null && symbol1 != null && symbol2 != null) {
            targetSymbol = symbol1 + "/" + symbol2;
        }
        if (targetSymbol == null || targetSymbol.trim().isEmpty()) {
            throw new BadRequestException("Symbol parameter is required");
        }
        MarketQuoteDto quote = marketDataService.getQuote(targetSymbol.trim().toUpperCase());
        return ResponseEntity.ok(quote);
    }

    /**
     * Retrieves real-time quotes for multiple ticker symbols in batch.
     * GET /api/market/quotes?symbols=AAPL,MSFT,TSLA
     */
    @GetMapping("/quotes")
    public ResponseEntity<List<MarketQuoteDto>> getQuotes(@RequestParam(required = false) List<String> symbols,
                                                          @RequestParam(required = false, name = "symbolsString") String rawSymbols) {
        List<String> targetSymbols = symbols;
        if ((targetSymbols == null || targetSymbols.isEmpty()) && rawSymbols != null && !rawSymbols.trim().isEmpty()) {
            targetSymbols = Arrays.stream(rawSymbols.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }

        if (targetSymbols == null || targetSymbols.isEmpty()) {
            throw new BadRequestException("Query parameter 'symbols' is required (e.g. ?symbols=AAPL,MSFT,TSLA)");
        }

        List<MarketQuoteDto> quotes = marketDataService.getQuotes(targetSymbols);
        return ResponseEntity.ok(quotes);
    }

    /**
     * Searches for matching equity tickers and company names.
     * GET /api/market/search?query=Apple
     */
    @GetMapping("/search")
    public ResponseEntity<List<MarketSearchResultDto>> search(@RequestParam(name = "query", required = false) String query) {
        if (query == null || query.trim().isEmpty()) {
            throw new BadRequestException("Query parameter 'query' is required");
        }

        List<MarketSearchResultDto> results = marketDataService.search(query);
        return ResponseEntity.ok(results);
    }
}
