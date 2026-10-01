package com.portfoliopro.service;

import com.portfoliopro.dto.AllocationItemDto;
import com.portfoliopro.dto.HoldingResponse;
import com.portfoliopro.dto.PortfolioAnalyticsResponse;
import com.portfoliopro.dto.PortfolioResponse;
import com.portfoliopro.dto.PortfolioSummaryResponse;
import com.portfoliopro.entity.Holding;
import com.portfoliopro.entity.Stock;
import com.portfoliopro.entity.User;
import com.portfoliopro.repository.HoldingRepository;
import com.portfoliopro.repository.UserRepository;
import com.portfoliopro.service.valuation.PortfolioValuationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PortfolioServiceTest {

    @Mock
    private HoldingRepository holdingRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PortfolioValuationService portfolioValuationService;

    @InjectMocks
    private PortfolioService portfolioService;

    private User testUser;
    private Stock aapl;
    private Stock tsla;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");

        aapl = new Stock();
        aapl.setId(10L);
        aapl.setSymbol("AAPL");
        aapl.setCompanyName("Apple Inc.");
        aapl.setPrice(new BigDecimal("220.00"));

        tsla = new Stock();
        tsla.setId(20L);
        tsla.setSymbol("TSLA");
        tsla.setCompanyName("Tesla Inc.");
        tsla.setPrice(new BigDecimal("250.00"));
    }

    @Test
    @DisplayName("Should return empty portfolio when user has no holdings")
    void getPortfolio_emptyHoldings() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(holdingRepository.findByUserOrderByStockSymbolAsc(testUser)).thenReturn(Collections.emptyList());

        PortfolioResponse emptyResponse = new PortfolioResponse(
                new BigDecimal("0.00"),
                new BigDecimal("0.00"),
                new BigDecimal("0.00"),
                new BigDecimal("0.00"),
                Collections.emptyList(),
                new BigDecimal("0.00"),
                new BigDecimal("0.00"),
                true,
                "REAL_TIME"
        );
        when(portfolioValuationService.valuatePortfolio(eq(Collections.emptyList()), any(BigDecimal.class)))
                .thenReturn(emptyResponse);

        PortfolioResponse response = portfolioService.getPortfolio("testuser");

        assertNotNull(response);
        assertEquals(new BigDecimal("0.00"), response.getTotalInvested());
        assertEquals(new BigDecimal("0.00"), response.getCurrentValue());
        assertEquals(new BigDecimal("0.00"), response.getTotalProfitLoss());
        assertEquals(new BigDecimal("0.00"), response.getProfitLossPercent());
        assertTrue(response.getHoldings().isEmpty());
    }

    @Test
    @DisplayName("Should delegate to PortfolioValuationService to obtain real-time valuations")
    void getPortfolio_withHoldings() {
        Holding h1 = new Holding(testUser, aapl, 10, new BigDecimal("200.00"));
        Holding h2 = new Holding(testUser, tsla, 5, new BigDecimal("300.00"));
        List<Holding> holdings = Arrays.asList(h1, h2);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(holdingRepository.findByUserOrderByStockSymbolAsc(testUser)).thenReturn(holdings);

        HoldingResponse r1 = new HoldingResponse(10L, "AAPL", "Apple Inc.", 10,
                new BigDecimal("200.00"), new BigDecimal("338.40"),
                new BigDecimal("2000.00"), new BigDecimal("3384.00"),
                new BigDecimal("1384.00"), new BigDecimal("69.20"),
                true, "CLOSED", "2026-09-28T13:30:00Z");

        HoldingResponse r2 = new HoldingResponse(20L, "TSLA", "Tesla Inc.", 5,
                new BigDecimal("300.00"), new BigDecimal("357.45"),
                new BigDecimal("1500.00"), new BigDecimal("1787.25"),
                new BigDecimal("287.25"), new BigDecimal("19.15"),
                true, "CLOSED", "2026-09-28T13:30:00Z");

        PortfolioResponse valuationResponse = new PortfolioResponse(
                new BigDecimal("3500.00"),
                new BigDecimal("5171.25"),
                new BigDecimal("1671.25"),
                new BigDecimal("47.75"),
                Arrays.asList(r1, r2),
                BigDecimal.ZERO,
                new BigDecimal("5171.25"),
                true,
                "REAL_TIME"
        );

        when(portfolioValuationService.valuatePortfolio(eq(holdings), any(BigDecimal.class)))
                .thenReturn(valuationResponse);

        PortfolioResponse response = portfolioService.getPortfolio("testuser");

        assertNotNull(response);
        assertEquals(2, response.getHoldings().size());
        assertEquals(new BigDecimal("3500.00"), response.getTotalInvested());
        assertEquals(new BigDecimal("5171.25"), response.getCurrentValue());
        assertEquals(new BigDecimal("1671.25"), response.getTotalProfitLoss());
        assertEquals(new BigDecimal("47.75"), response.getProfitLossPercent());
        assertTrue(response.getMarketDataAvailable());
        assertEquals("REAL_TIME", response.getValuationStatus());
    }

    @Test
    @DisplayName("Should return summary accurately mapped from portfolio valuation")
    void getPortfolioSummary_delegatesCorrectly() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(holdingRepository.findByUserOrderByStockSymbolAsc(testUser)).thenReturn(Collections.emptyList());

        PortfolioResponse valuationResponse = new PortfolioResponse(
                new BigDecimal("5000.00"),
                new BigDecimal("7500.00"),
                new BigDecimal("2500.00"),
                new BigDecimal("50.00"),
                Collections.emptyList(),
                new BigDecimal("1000.00"),
                new BigDecimal("6500.00"),
                true,
                "REAL_TIME"
        );
        when(portfolioValuationService.valuatePortfolio(anyList(), any(BigDecimal.class)))
                .thenReturn(valuationResponse);

        PortfolioSummaryResponse summary = portfolioService.getPortfolioSummary("testuser");

        assertNotNull(summary);
        assertEquals(new BigDecimal("5000.00"), summary.getTotalInvested());
        assertEquals(new BigDecimal("7500.00"), summary.getCurrentValue());
        assertEquals(new BigDecimal("2500.00"), summary.getTotalProfitLoss());
        assertEquals(new BigDecimal("50.00"), summary.getProfitLossPercent());
        assertEquals(new BigDecimal("1000.00"), summary.getAvailableCash());
        assertTrue(summary.getMarketDataAvailable());
        assertEquals("REAL_TIME", summary.getValuationStatus());
    }

    @Test
    @DisplayName("Should return analytics for 1 holding with Low Diversification and High Concentration")
    void getPortfolioAnalytics_1Holding() {
        Holding h1 = new Holding(testUser, aapl, 10, new BigDecimal("200.00"));

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(holdingRepository.findByUserOrderByStockSymbolAsc(testUser)).thenReturn(Collections.singletonList(h1));

        HoldingResponse r1 = new HoldingResponse(10L, "AAPL", "Apple Inc.", 10,
                new BigDecimal("200.00"), new BigDecimal("220.00"),
                new BigDecimal("2000.00"), new BigDecimal("2200.00"),
                new BigDecimal("200.00"), new BigDecimal("10.00"),
                true, "OPEN", null);

        PortfolioResponse valuationResponse = new PortfolioResponse(
                new BigDecimal("2000.00"),
                new BigDecimal("2200.00"),
                new BigDecimal("200.00"),
                new BigDecimal("10.00"),
                Collections.singletonList(r1),
                BigDecimal.ZERO,
                new BigDecimal("2200.00"),
                true,
                "REAL_TIME"
        );
        when(portfolioValuationService.valuatePortfolio(anyList(), any(BigDecimal.class)))
                .thenReturn(valuationResponse);

        PortfolioAnalyticsResponse analytics = portfolioService.getPortfolioAnalytics("testuser");

        assertNotNull(analytics);
        assertEquals(1, analytics.getNumberOfHoldings());
        assertEquals("Low Diversification", analytics.getDiversification());
        assertEquals("High Concentration", analytics.getRiskIndicator());
        assertEquals(1, analytics.getAllocation().size());
        assertEquals("AAPL", analytics.getAllocation().get(0).getSymbol());
        assertEquals(new BigDecimal("100.00"), analytics.getAllocation().get(0).getPercentage());
    }

    @Test
    @DisplayName("Should return analytics for 2 holdings with Moderate Diversification and Moderate Concentration")
    void getPortfolioAnalytics_2Holdings() {
        Holding h1 = new Holding(testUser, aapl, 10, new BigDecimal("200.00"));
        Holding h2 = new Holding(testUser, tsla, 5, new BigDecimal("300.00"));

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(holdingRepository.findByUserOrderByStockSymbolAsc(testUser)).thenReturn(Arrays.asList(h1, h2));

        HoldingResponse r1 = new HoldingResponse(10L, "AAPL", "Apple Inc.", 10,
                new BigDecimal("200.00"), new BigDecimal("220.00"),
                new BigDecimal("2000.00"), new BigDecimal("2200.00"),
                new BigDecimal("200.00"), new BigDecimal("10.00"),
                true, "OPEN", null);

        HoldingResponse r2 = new HoldingResponse(20L, "TSLA", "Tesla Inc.", 5,
                new BigDecimal("300.00"), new BigDecimal("250.00"),
                new BigDecimal("1500.00"), new BigDecimal("1250.00"),
                new BigDecimal("-250.00"), new BigDecimal("-16.67"),
                true, "OPEN", null);

        PortfolioResponse valuationResponse = new PortfolioResponse(
                new BigDecimal("3500.00"),
                new BigDecimal("3450.00"),
                new BigDecimal("-50.00"),
                new BigDecimal("-1.43"),
                Arrays.asList(r1, r2),
                BigDecimal.ZERO,
                new BigDecimal("3450.00"),
                true,
                "REAL_TIME"
        );
        when(portfolioValuationService.valuatePortfolio(anyList(), any(BigDecimal.class)))
                .thenReturn(valuationResponse);

        PortfolioAnalyticsResponse analytics = portfolioService.getPortfolioAnalytics("testuser");

        assertNotNull(analytics);
        assertEquals(2, analytics.getNumberOfHoldings());
        assertEquals("Moderate Diversification", analytics.getDiversification());
        assertEquals("Moderate Concentration", analytics.getRiskIndicator());
        assertEquals(2, analytics.getAllocation().size());
        assertEquals("AAPL", analytics.getAllocation().get(0).getSymbol());
        assertEquals(new BigDecimal("63.77"), analytics.getAllocation().get(0).getPercentage());
        assertEquals("TSLA", analytics.getAllocation().get(1).getSymbol());
        assertEquals(new BigDecimal("36.23"), analytics.getAllocation().get(1).getPercentage());
    }

    @Test
    @DisplayName("Should return analytics for 4+ holdings with Higher Diversification and Lower Concentration")
    void getPortfolioAnalytics_4PlusHoldings() {
        Stock msft = new Stock();
        msft.setId(30L);
        msft.setSymbol("MSFT");

        Stock googl = new Stock();
        googl.setId(40L);
        googl.setSymbol("GOOGL");

        Holding h1 = new Holding(testUser, aapl, 10, new BigDecimal("200.00"));
        Holding h2 = new Holding(testUser, tsla, 5, new BigDecimal("300.00"));
        Holding h3 = new Holding(testUser, msft, 2, new BigDecimal("380.00"));
        Holding h4 = new Holding(testUser, googl, 8, new BigDecimal("140.00"));

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(holdingRepository.findByUserOrderByStockSymbolAsc(testUser)).thenReturn(Arrays.asList(h1, h2, h3, h4));

        HoldingResponse r1 = new HoldingResponse(10L, "AAPL", "Apple Inc.", 10, new BigDecimal("200.00"), new BigDecimal("220.00"), new BigDecimal("2000.00"), new BigDecimal("2200.00"), BigDecimal.ZERO, BigDecimal.ZERO);
        HoldingResponse r2 = new HoldingResponse(20L, "TSLA", "Tesla Inc.", 5, new BigDecimal("300.00"), new BigDecimal("250.00"), new BigDecimal("1500.00"), new BigDecimal("1250.00"), BigDecimal.ZERO, BigDecimal.ZERO);
        HoldingResponse r3 = new HoldingResponse(30L, "MSFT", "Microsoft", 2, new BigDecimal("380.00"), new BigDecimal("400.00"), new BigDecimal("760.00"), new BigDecimal("800.00"), BigDecimal.ZERO, BigDecimal.ZERO);
        HoldingResponse r4 = new HoldingResponse(40L, "GOOGL", "Alphabet", 8, new BigDecimal("140.00"), new BigDecimal("150.00"), new BigDecimal("1120.00"), new BigDecimal("1200.00"), BigDecimal.ZERO, BigDecimal.ZERO);

        PortfolioResponse valuationResponse = new PortfolioResponse(
                new BigDecimal("5380.00"),
                new BigDecimal("5450.00"),
                new BigDecimal("70.00"),
                new BigDecimal("1.30"),
                Arrays.asList(r1, r2, r3, r4),
                BigDecimal.ZERO,
                new BigDecimal("5450.00"),
                true,
                "REAL_TIME"
        );
        when(portfolioValuationService.valuatePortfolio(anyList(), any(BigDecimal.class)))
                .thenReturn(valuationResponse);

        PortfolioAnalyticsResponse analytics = portfolioService.getPortfolioAnalytics("testuser");

        assertNotNull(analytics);
        assertEquals(4, analytics.getNumberOfHoldings());
        assertEquals("Higher Diversification", analytics.getDiversification());
        assertEquals("Lower Concentration", analytics.getRiskIndicator());
        assertEquals(4, analytics.getAllocation().size());
    }
}
