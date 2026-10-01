package com.portfoliopro.service.valuation;

import com.portfoliopro.dto.HoldingResponse;
import com.portfoliopro.dto.PortfolioResponse;
import com.portfoliopro.dto.market.MarketQuoteDto;
import com.portfoliopro.entity.Holding;
import com.portfoliopro.entity.Stock;
import com.portfoliopro.entity.User;
import com.portfoliopro.service.market.MarketDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PortfolioValuationServiceTest {

    @Mock
    private MarketDataService marketDataService;

    @InjectMocks
    private PortfolioValuationServiceImpl valuationService;

    private User testUser;
    private Stock aapl;
    private Stock msft;
    private Stock tsla;

    @BeforeEach
    void setUp() {
        testUser = new User("testuser", "test@test.com", "pass");
        testUser.setId(1L);

        aapl = new Stock("AAPL", "Apple Inc.", new BigDecimal("225.50"), "Technology", 3400000000000L, new BigDecimal("6.42"), new BigDecimal("35.12"));
        aapl.setId(10L);

        msft = new Stock("MSFT", "Microsoft Corporation", new BigDecimal("428.20"), "Technology", 3100000000000L, new BigDecimal("11.80"), new BigDecimal("36.28"));
        msft.setId(20L);

        tsla = new Stock("TSLA", "Tesla Inc.", new BigDecimal("254.30"), "Consumer Cyclical", 800000000000L, new BigDecimal("2.15"), new BigDecimal("118.27"));
        tsla.setId(30L);
    }

    @Test
    @DisplayName("1. Single holding valuation should calculate exact market value, invested capital, and unrealized P/L")
    void testSingleHoldingValuation() {
        // AAPL: 10 shares bought at $225.50 (cost basis $2,255.00), current real market price $338.40
        Holding holding = new Holding(testUser, aapl, 10, new BigDecimal("225.50"));

        MarketQuoteDto quote = new MarketQuoteDto("AAPL", new BigDecimal("338.40"), new BigDecimal("-2.67"), new BigDecimal("-0.78"), Instant.parse("2026-09-28T13:30:00Z"), "CLOSED");
        when(marketDataService.getQuotes(List.of("AAPL"))).thenReturn(List.of(quote));

        PortfolioResponse response = valuationService.valuatePortfolio(List.of(holding), BigDecimal.ZERO);

        assertNotNull(response);
        assertEquals("REAL_TIME", response.getValuationStatus());
        assertTrue(response.getMarketDataAvailable());
        assertEquals(new BigDecimal("2255.00"), response.getTotalInvested());
        assertEquals(new BigDecimal("3384.00"), response.getCurrentValue());
        assertEquals(new BigDecimal("1129.00"), response.getTotalProfitLoss());
        assertEquals(new BigDecimal("50.07"), response.getProfitLossPercent());

        assertEquals(1, response.getHoldings().size());
        HoldingResponse hr = response.getHoldings().get(0);
        assertEquals("AAPL", hr.getSymbol());
        assertEquals(10, hr.getQuantity());
        assertEquals(new BigDecimal("225.50"), hr.getAverageBuyPrice());
        assertEquals(new BigDecimal("338.40"), hr.getCurrentPrice());
        assertEquals(new BigDecimal("2255.00"), hr.getInvestedValue());
        assertEquals(new BigDecimal("3384.00"), hr.getCurrentValue());
        assertEquals(new BigDecimal("1129.00"), hr.getProfitLoss());
        assertEquals(new BigDecimal("50.07"), hr.getProfitLossPercent());
        assertTrue(hr.getMarketDataAvailable());
        assertEquals("CLOSED", hr.getMarketStatus());
    }

    @Test
    @DisplayName("2. Multiple holding valuation should aggregate metrics across multiple equities")
    void testMultipleHoldingValuation() {
        Holding h1 = new Holding(testUser, aapl, 10, new BigDecimal("200.00")); // Invested: $2,000.00, Current: $300.00 * 10 = $3,000.00
        Holding h2 = new Holding(testUser, msft, 5, new BigDecimal("400.00"));  // Invested: $2,000.00, Current: $500.00 * 5  = $2,500.00

        MarketQuoteDto q1 = new MarketQuoteDto("AAPL", new BigDecimal("300.00"), BigDecimal.ZERO, BigDecimal.ZERO, Instant.parse("2026-09-28T13:30:00Z"), "OPEN");
        MarketQuoteDto q2 = new MarketQuoteDto("MSFT", new BigDecimal("500.00"), BigDecimal.ZERO, BigDecimal.ZERO, Instant.parse("2026-09-28T13:30:00Z"), "OPEN");
        when(marketDataService.getQuotes(anyList())).thenReturn(List.of(q1, q2));

        PortfolioResponse response = valuationService.valuatePortfolio(List.of(h1, h2), BigDecimal.ZERO);

        assertNotNull(response);
        assertEquals(2, response.getHoldings().size());
        assertEquals(new BigDecimal("4000.00"), response.getTotalInvested());
        assertEquals(new BigDecimal("5500.00"), response.getCurrentValue());
        assertEquals(new BigDecimal("1500.00"), response.getTotalProfitLoss());
        assertEquals(new BigDecimal("37.50"), response.getProfitLossPercent());
        assertEquals("REAL_TIME", response.getValuationStatus());
    }

    @Test
    @DisplayName("3. Positive unrealized P/L calculation")
    void testPositiveUnrealizedProfitLoss() {
        Holding holding = new Holding(testUser, aapl, 10, new BigDecimal("100.00")); // Cost: $1,000.00
        HoldingResponse hr = valuationService.valuateHolding(holding, new BigDecimal("150.00"));

        assertEquals(new BigDecimal("1000.00"), hr.getInvestedValue());
        assertEquals(new BigDecimal("1500.00"), hr.getCurrentValue());
        assertEquals(new BigDecimal("500.00"), hr.getProfitLoss());
        assertEquals(new BigDecimal("50.00"), hr.getProfitLossPercent());
    }

    @Test
    @DisplayName("4. Negative unrealized P/L calculation")
    void testNegativeUnrealizedProfitLoss() {
        Holding holding = new Holding(testUser, tsla, 10, new BigDecimal("200.00")); // Cost: $2,000.00
        HoldingResponse hr = valuationService.valuateHolding(holding, new BigDecimal("150.00")); // Value: $1,500.00

        assertEquals(new BigDecimal("2000.00"), hr.getInvestedValue());
        assertEquals(new BigDecimal("1500.00"), hr.getCurrentValue());
        assertEquals(new BigDecimal("-500.00"), hr.getProfitLoss());
        assertEquals(new BigDecimal("-25.00"), hr.getProfitLossPercent());
    }

    @Test
    @DisplayName("5. Zero P/L when market price equals average cost")
    void testZeroProfitLoss() {
        Holding holding = new Holding(testUser, aapl, 15, new BigDecimal("150.00"));
        HoldingResponse hr = valuationService.valuateHolding(holding, new BigDecimal("150.00"));

        assertEquals(new BigDecimal("2250.00"), hr.getInvestedValue());
        assertEquals(new BigDecimal("2250.00"), hr.getCurrentValue());
        assertEquals(new BigDecimal("0.00"), hr.getProfitLoss());
        assertEquals(new BigDecimal("0.00"), hr.getProfitLossPercent());
    }

    @Test
    @DisplayName("6. Average cost calculation when executing incremental BUY orders")
    void testAverageCostCalculation() {
        // Own 10 shares @ $100.00, buy 10 more @ $200.00 -> New average: (1000 + 2000) / 20 = $150.00
        BigDecimal newAvg1 = valuationService.calculateNewAverageBuyPrice(10, new BigDecimal("100.00"), 10, new BigDecimal("200.00"));
        assertEquals(new BigDecimal("150.00"), newAvg1);

        // Own 5 shares @ $225.50, buy 3 shares @ $338.40
        // (5 * 225.50 + 3 * 338.40) / 8 = (1127.50 + 1015.20) / 8 = 2142.70 / 8 = 267.8375 -> rounded to 267.84
        BigDecimal newAvg2 = valuationService.calculateNewAverageBuyPrice(5, new BigDecimal("225.50"), 3, new BigDecimal("338.40"));
        assertEquals(new BigDecimal("267.84"), newAvg2);

        // Edge case: Initial buy (existing quantity 0)
        BigDecimal initialAvg = valuationService.calculateNewAverageBuyPrice(0, BigDecimal.ZERO, 5, new BigDecimal("338.40"));
        assertEquals(new BigDecimal("338.40"), initialAvg);
    }

    @Test
    @DisplayName("7. Cash + Holdings portfolio valuation")
    void testCashPlusHoldingsPortfolioValue() {
        Holding holding = new Holding(testUser, aapl, 10, new BigDecimal("200.00")); // Cost: $2,000.00, Value @ $250: $2,500.00
        MarketQuoteDto quote = new MarketQuoteDto("AAPL", new BigDecimal("250.00"), BigDecimal.ZERO, BigDecimal.ZERO, Instant.parse("2026-09-28T13:30:00Z"), "OPEN");
        when(marketDataService.getQuotes(List.of("AAPL"))).thenReturn(List.of(quote));

        BigDecimal availableCash = new BigDecimal("7500.00");
        PortfolioResponse response = valuationService.valuatePortfolio(List.of(holding), availableCash);

        assertNotNull(response);
        assertEquals(new BigDecimal("2000.00"), response.getTotalInvested()); // Invested capital in stock
        assertEquals(new BigDecimal("2500.00"), response.getHoldingsValue()); // Total stock value
        assertEquals(new BigDecimal("7500.00"), response.getAvailableCash()); // Available uninvested cash
        assertEquals(new BigDecimal("10000.00"), response.getCurrentValue()); // Total equity = $2,500 + $7,500 = $10,000.00
        assertEquals(new BigDecimal("500.00"), response.getTotalProfitLoss()); // Stock unrealized P/L = $500
        assertEquals(new BigDecimal("25.00"), response.getProfitLossPercent());
        assertEquals("REAL_TIME", response.getValuationStatus());
    }

    @Test
    @DisplayName("8. Missing market price should clearly mark data unavailable and NOT substitute fake/demo prices")
    void testMissingMarketPrice() {
        Holding h1 = new Holding(testUser, aapl, 10, new BigDecimal("225.50"));
        Holding h2 = new Holding(testUser, tsla, 5, new BigDecimal("254.30"));

        // Simulate provider only returning quote for AAPL, TSLA is missing/unquoted
        MarketQuoteDto q1 = new MarketQuoteDto("AAPL", new BigDecimal("338.40"), BigDecimal.ZERO, BigDecimal.ZERO, Instant.parse("2026-09-28T13:30:00Z"), "CLOSED");
        when(marketDataService.getQuotes(anyList())).thenReturn(List.of(q1));

        PortfolioResponse response = valuationService.valuatePortfolio(List.of(h1, h2), new BigDecimal("1000.00"));

        assertNotNull(response);
        assertFalse(response.getMarketDataAvailable());
        assertEquals("PARTIALLY_VALUED", response.getValuationStatus());

        // Must not calculate a fake or truncated total portfolio value
        assertNull(response.getCurrentValue());
        assertNull(response.getTotalProfitLoss());
        assertNull(response.getProfitLossPercent());

        // Total invested remains completely accurate
        assertEquals(new BigDecimal("3526.50"), response.getTotalInvested()); // (10 * 225.50) + (5 * 254.30)

        // Holding 1 is valued
        HoldingResponse hr1 = response.getHoldings().stream().filter(h -> "AAPL".equals(h.getSymbol())).findFirst().orElseThrow();
        assertTrue(hr1.getMarketDataAvailable());
        assertEquals(new BigDecimal("338.40"), hr1.getCurrentPrice());
        assertEquals(new BigDecimal("3384.00"), hr1.getCurrentValue());

        // Holding 2 is unavailable
        HoldingResponse hr2 = response.getHoldings().stream().filter(h -> "TSLA".equals(h.getSymbol())).findFirst().orElseThrow();
        assertFalse(hr2.getMarketDataAvailable());
        assertNull(hr2.getCurrentPrice());
        assertNull(hr2.getCurrentValue());
        assertNull(hr2.getProfitLoss());
        assertNull(hr2.getProfitLossPercent());
        assertEquals("UNAVAILABLE", hr2.getMarketStatus());
    }

    @Test
    @DisplayName("9. Multiple holdings using different current market prices")
    void testMultipleHoldingsUsingDifferentCurrentPrices() {
        Holding h1 = new Holding(testUser, aapl, 10, new BigDecimal("225.50")); // AAPL: 10 @ 225.50 -> $2,255.00
        Holding h2 = new Holding(testUser, msft, 4, new BigDecimal("428.20"));  // MSFT:  4 @ 428.20 -> $1,712.80
        Holding h3 = new Holding(testUser, tsla, 5, new BigDecimal("254.30"));  // TSLA:  5 @ 254.30 -> $1,271.50

        // Live prices
        MarketQuoteDto q1 = new MarketQuoteDto("AAPL", new BigDecimal("338.40"), BigDecimal.ZERO, BigDecimal.ZERO, Instant.parse("2026-09-28T13:30:00Z"), "CLOSED"); // $3,384.00
        MarketQuoteDto q2 = new MarketQuoteDto("MSFT", new BigDecimal("509.22"), BigDecimal.ZERO, BigDecimal.ZERO, Instant.parse("2026-09-28T13:30:00Z"), "CLOSED"); // $2,036.88
        MarketQuoteDto q3 = new MarketQuoteDto("TSLA", new BigDecimal("357.45"), BigDecimal.ZERO, BigDecimal.ZERO, Instant.parse("2026-09-28T13:30:00Z"), "CLOSED"); // $1,787.25
        when(marketDataService.getQuotes(anyList())).thenReturn(List.of(q1, q2, q3));

        PortfolioResponse response = valuationService.valuatePortfolio(List.of(h1, h2, h3), BigDecimal.ZERO);

        assertNotNull(response);
        assertEquals("REAL_TIME", response.getValuationStatus());
        assertTrue(response.getMarketDataAvailable());

        // Total Invested: 2255.00 + 1712.80 + 1271.50 = 5239.30
        assertEquals(new BigDecimal("5239.30"), response.getTotalInvested());

        // Total Current Value: 3384.00 + 2036.88 + 1787.25 = 7208.13
        assertEquals(new BigDecimal("7208.13"), response.getCurrentValue());

        // Total P/L: 7208.13 - 5239.30 = +1968.83
        assertEquals(new BigDecimal("1968.83"), response.getTotalProfitLoss());

        // P/L %: (1968.83 * 100) / 5239.30 = 37.58%
        assertEquals(new BigDecimal("37.58"), response.getProfitLossPercent());
    }

    @Test
    @DisplayName("10. Precision and rounding verifies exact BigDecimal decimal arithmetic")
    void testPrecisionAndRounding() {
        // Holding with fractional decimal outcomes: 3 shares @ 33.33 cost, current price 33.34
        Holding holding = new Holding(testUser, aapl, 3, new BigDecimal("33.33")); // Cost: 99.99
        HoldingResponse hr = valuationService.valuateHolding(holding, new BigDecimal("33.34")); // Value: 100.02

        assertEquals(new BigDecimal("99.99"), hr.getInvestedValue());
        assertEquals(new BigDecimal("100.02"), hr.getCurrentValue());
        assertEquals(new BigDecimal("0.03"), hr.getProfitLoss());
        // 0.03 / 99.99 * 100 = 0.030003... -> 0.03%
        assertEquals(new BigDecimal("0.03"), hr.getProfitLossPercent());
    }

    @Test
    @DisplayName("11. Empty portfolio valuation returns zero balances with cash preserved")
    void testEmptyPortfolioValuation() {
        PortfolioResponse response = valuationService.valuatePortfolio(Collections.emptyList(), new BigDecimal("5000.00"));

        assertNotNull(response);
        assertEquals(new BigDecimal("0.00"), response.getTotalInvested());
        assertEquals(new BigDecimal("0.00"), response.getHoldingsValue());
        assertEquals(new BigDecimal("5000.00"), response.getAvailableCash());
        assertEquals(new BigDecimal("5000.00"), response.getCurrentValue());
        assertEquals(new BigDecimal("0.00"), response.getTotalProfitLoss());
        assertEquals(new BigDecimal("0.00"), response.getProfitLossPercent());
        assertTrue(response.getHoldings().isEmpty());
        assertTrue(response.getMarketDataAvailable());
        assertEquals("REAL_TIME", response.getValuationStatus());
    }
}
