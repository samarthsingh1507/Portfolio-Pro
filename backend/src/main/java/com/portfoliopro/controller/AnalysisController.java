package com.portfoliopro.controller;

import com.portfoliopro.dto.FundamentalAnalysisResponse;
import com.portfoliopro.dto.TechnicalAnalysisResponse;
import com.portfoliopro.service.AnalysisService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analysis")
public class AnalysisController {

    private final AnalysisService analysisService;

    public AnalysisController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @GetMapping(value = {"/technical/{symbol}", "/technical/{symbol1}/{symbol2}"})
    public ResponseEntity<TechnicalAnalysisResponse> getTechnicalAnalysis(@PathVariable(required = false) String symbol,
                                                                         @PathVariable(required = false) String symbol1,
                                                                         @PathVariable(required = false) String symbol2) {
        String targetSymbol = symbol;
        if (targetSymbol == null && symbol1 != null && symbol2 != null) {
            targetSymbol = symbol1 + "/" + symbol2;
        }
        TechnicalAnalysisResponse response = analysisService.getTechnicalAnalysis(targetSymbol);
        return ResponseEntity.ok(response);
    }

    @GetMapping(value = {"/fundamental/{symbol}", "/fundamental/{symbol1}/{symbol2}"})
    public ResponseEntity<FundamentalAnalysisResponse> getFundamentalAnalysis(@PathVariable(required = false) String symbol,
                                                                             @PathVariable(required = false) String symbol1,
                                                                             @PathVariable(required = false) String symbol2) {
        String targetSymbol = symbol;
        if (targetSymbol == null && symbol1 != null && symbol2 != null) {
            targetSymbol = symbol1 + "/" + symbol2;
        }
        FundamentalAnalysisResponse response = analysisService.getFundamentalAnalysis(targetSymbol);
        return ResponseEntity.ok(response);
    }
}
