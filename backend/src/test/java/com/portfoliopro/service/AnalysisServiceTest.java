package com.portfoliopro.service;

import com.portfoliopro.dto.FundamentalAnalysisResponse;
import com.portfoliopro.dto.TechnicalAnalysisResponse;
import com.portfoliopro.entity.PriceHistory;
import com.portfoliopro.entity.Stock;
import com.portfoliopro.exception.ResourceNotFoundException;
import com.portfoliopro.repository.PriceHistoryRepository;
import com.portfoliopro.repository.StockRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnalysisServiceTest {

    @Mock
    private StockRepository stockRepository;

    @Mock
    private PriceHistoryRepository priceHistoryRepository;

    @Mock
    private com.portfoliopro.service.market.MarketDataService marketDataService;

    @Mock
    private MarketService marketService;

    @InjectMocks
    private AnalysisService analysisService;

    private Stock aapl;

    @BeforeEach
    void setUp() {
        aapl = new Stock();
        aapl.setId(1L);
        aapl.setSymbol("AAPL");
        aapl.setCompanyName("Apple Inc.");
        aapl.setPrice(new BigDecimal("225.50"));
        aapl.setSector("Technology");
        aapl.setMarketCap(3450000000000L);
        aapl.setEps(new BigDecimal("6.42"));
        aapl.setPeRatio(new BigDecimal("35.12"));
    }

    @Test
    @DisplayName("Should return fundamental analysis successfully")
    void getFundamentalAnalysis_success() {
        when(stockRepository.findBySymbolIgnoreCase("AAPL")).thenReturn(Optional.of(aapl));

        FundamentalAnalysisResponse response = analysisService.getFundamentalAnalysis("AAPL");

        assertNotNull(response);
        assertEquals("AAPL", response.getSymbol());
        assertEquals("Apple Inc.", response.getCompanyName());
        assertEquals("Technology", response.getSector());
        assertEquals(3450000000000L, response.getMarketCap());
        assertEquals(new BigDecimal("6.42"), response.getEps());
        assertEquals(new BigDecimal("35.12"), response.getPeRatio());
    }

    @Test
    @DisplayName("Should create and return fundamental analysis when stock is requested dynamically")
    void getFundamentalAnalysis_dynamicCreation() {
        when(stockRepository.findBySymbolIgnoreCase("BABA")).thenReturn(Optional.empty());
        Stock baba = new Stock("BABA", "BABA Corporation", new BigDecimal("105.00"), "Global Equities", 250000000000L, new BigDecimal("5.20"), new BigDecimal("18.50"));
        when(marketService.findOrCreateStock("BABA")).thenReturn(baba);

        FundamentalAnalysisResponse response = analysisService.getFundamentalAnalysis("BABA");

        assertNotNull(response);
        assertEquals("BABA", response.getSymbol());
        assertEquals("BABA Corporation", response.getCompanyName());
    }

    @Test
    @DisplayName("Should calculate technical analysis with 5-year history, MA20, MA50, and RSI14")
    void getTechnicalAnalysis_with5YearHistory() {
        when(stockRepository.findBySymbolIgnoreCase("AAPL")).thenReturn(Optional.of(aapl));

        TechnicalAnalysisResponse response = analysisService.getTechnicalAnalysis("AAPL");

        assertNotNull(response);
        assertEquals("AAPL", response.getSymbol());
        assertEquals(new BigDecimal("225.50"), response.getCurrentPrice());
        assertTrue(response.getPriceHistory().size() >= 1000); // 5 years of trading days

        assertNotNull(response.getMovingAverage20());
        assertNotNull(response.getMovingAverage50());
        assertNotNull(response.getRsi14());
    }

    @Test
    @DisplayName("Should compute moving averages accurately from price history DTOs")
    void calculateMovingAverageFromDtos_success() {
        List<com.portfoliopro.dto.PriceHistoryItemDto> dtos = new ArrayList<>();
        LocalDate start = LocalDate.of(2026, 1, 1);
        for (int i = 0; i < 20; i++) {
            dtos.add(new com.portfoliopro.dto.PriceHistoryItemDto(start.plusDays(i), BigDecimal.valueOf(100 + i)));
        }

        BigDecimal ma20 = analysisService.calculateMovingAverageFromDtos(dtos, 20);
        assertNotNull(ma20);
        assertEquals(new BigDecimal("109.50"), ma20);

        BigDecimal ma50 = analysisService.calculateMovingAverageFromDtos(dtos, 50);
        assertNull(ma50); // Less than 50 points
    }

    @Test
    @DisplayName("Should compute RSI accurately from price history DTOs")
    void calculateRsiFromDtos_success() {
        List<com.portfoliopro.dto.PriceHistoryItemDto> dtos = new ArrayList<>();
        LocalDate start = LocalDate.of(2026, 1, 1);
        for (int i = 0; i < 30; i++) {
            dtos.add(new com.portfoliopro.dto.PriceHistoryItemDto(start.plusDays(i), BigDecimal.valueOf(100 + i)));
        }

        BigDecimal rsi = analysisService.calculateRsiFromDtos(dtos, 14);
        assertNotNull(rsi);
        assertEquals(new BigDecimal("100.00"), rsi);
    }
}
