package com.portfoliopro.controller;

import com.portfoliopro.dto.StockDetailResponse;
import com.portfoliopro.dto.StockResponse;
import com.portfoliopro.service.MarketService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/stocks")
public class MarketController {

    private final MarketService marketService;

    public MarketController(MarketService marketService) {
        this.marketService = marketService;
    }

    @GetMapping
    public ResponseEntity<List<StockResponse>> getAllStocks() {
        List<StockResponse> stocks = marketService.getAllStocks();
        return ResponseEntity.ok(stocks);
    }

    @GetMapping(value = {"/{symbol}", "/{symbol1}/{symbol2}"})
    public ResponseEntity<StockDetailResponse> getStockDetail(@PathVariable(required = false) String symbol,
                                                             @PathVariable(required = false) String symbol1,
                                                             @PathVariable(required = false) String symbol2,
                                                             Principal principal) {
        String targetSymbol = symbol;
        if (targetSymbol == null && symbol1 != null && symbol2 != null) {
            targetSymbol = symbol1 + "/" + symbol2;
        }
        String username = principal != null ? principal.getName() : null;
        StockDetailResponse detail = marketService.getStockDetail(targetSymbol, username);
        return ResponseEntity.ok(detail);
    }
}
