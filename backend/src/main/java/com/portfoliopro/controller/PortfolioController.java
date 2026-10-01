package com.portfoliopro.controller;

import com.portfoliopro.dto.PortfolioAnalyticsResponse;
import com.portfoliopro.dto.PortfolioResponse;
import com.portfoliopro.dto.PortfolioSummaryResponse;
import com.portfoliopro.service.PortfolioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/portfolio")
public class PortfolioController {

    private final PortfolioService portfolioService;

    public PortfolioController(PortfolioService portfolioService) {
        this.portfolioService = portfolioService;
    }

    @GetMapping
    public ResponseEntity<PortfolioResponse> getPortfolio(Principal principal) {
        PortfolioResponse portfolio = portfolioService.getPortfolio(principal.getName());
        return ResponseEntity.ok(portfolio);
    }

    @GetMapping("/summary")
    public ResponseEntity<PortfolioSummaryResponse> getPortfolioSummary(Principal principal) {
        PortfolioSummaryResponse summary = portfolioService.getPortfolioSummary(principal.getName());
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/analytics")
    public ResponseEntity<PortfolioAnalyticsResponse> getPortfolioAnalytics(Principal principal) {
        PortfolioAnalyticsResponse analytics = portfolioService.getPortfolioAnalytics(principal.getName());
        return ResponseEntity.ok(analytics);
    }
}
