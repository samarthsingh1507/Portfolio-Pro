package com.portfoliopro.service.valuation;

import com.portfoliopro.dto.HoldingResponse;
import com.portfoliopro.dto.PortfolioResponse;
import com.portfoliopro.dto.market.MarketQuoteDto;
import com.portfoliopro.entity.Holding;
import com.portfoliopro.entity.Stock;
import com.portfoliopro.service.market.MarketDataService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class PortfolioValuationServiceImpl implements PortfolioValuationService {

    private static final Logger log = LoggerFactory.getLogger(PortfolioValuationServiceImpl.class);

    private final MarketDataService marketDataService;

    public PortfolioValuationServiceImpl(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    @Override
    public PortfolioResponse valuatePortfolio(List<Holding> holdings, BigDecimal availableCash) {
        BigDecimal cash = (availableCash != null && availableCash.compareTo(BigDecimal.ZERO) >= 0)
                ? availableCash.setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        // Handle empty portfolio
        if (holdings == null || holdings.isEmpty()) {
            BigDecimal zero = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            return new PortfolioResponse(
                    zero,             // totalInvested
                    cash,             // currentValue (equals available cash)
                    zero,             // totalProfitLoss
                    zero,             // profitLossPercent
                    Collections.emptyList(),
                    cash,             // availableCash
                    zero,             // holdingsValue
                    true,             // marketDataAvailable
                    "REAL_TIME"       // valuationStatus
            );
        }

        // 1. Collect distinct ticker symbols for batch market quote lookup
        List<String> symbols = holdings.stream()
                .map(Holding::getStock)
                .filter(Objects::nonNull)
                .map(Stock::getSymbol)
                .filter(Objects::nonNull)
                .map(String::trim)
                .map(String::toUpperCase)
                .distinct()
                .toList();

        // 2. Efficient batch quote retrieval leveraging 15-second cache
        Map<String, MarketQuoteDto> quoteMap = new HashMap<>();
        if (!symbols.isEmpty()) {
            try {
                List<MarketQuoteDto> quotes = marketDataService.getQuotes(symbols);
                for (MarketQuoteDto q : quotes) {
                    if (q != null && q.getSymbol() != null && q.getPrice() != null) {
                        quoteMap.put(q.getSymbol().trim().toUpperCase(), q);
                    }
                }
            } catch (Exception ex) {
                log.warn("Market data service unavailable during portfolio valuation for symbols=[{}]: {}",
                        symbols, ex.getMessage());
                // Do NOT substitute fake/demo prices; quoteMap remains empty/partial
            }
        }

        // 3. Valuate each holding
        List<HoldingResponse> holdingResponses = new ArrayList<>(holdings.size());
        BigDecimal totalInvested = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalHoldingsValue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        int missingQuoteCount = 0;

        for (Holding holding : holdings) {
            String sym = holding.getStock() != null ? holding.getStock().getSymbol().trim().toUpperCase() : "";
            MarketQuoteDto quote = quoteMap.get(sym);

            HoldingResponse hr;
            if (quote != null && quote.getPrice() != null) {
                hr = valuateHolding(holding, quote.getPrice(), quote.getMarketStatus(),
                        quote.getTimestamp() != null ? quote.getTimestamp().toString() : null);
                totalHoldingsValue = totalHoldingsValue.add(hr.getCurrentValue());
            } else {
                missingQuoteCount++;
                hr = valuateHolding(holding, null, "UNAVAILABLE", null);
            }

            totalInvested = totalInvested.add(hr.getInvestedValue());
            holdingResponses.add(hr);
        }

        // 4. Calculate aggregate portfolio metrics
        if (missingQuoteCount == 0) {
            // Full real-time valuation
            BigDecimal currentValue = totalHoldingsValue.add(cash).setScale(2, RoundingMode.HALF_UP);
            BigDecimal totalProfitLoss = totalHoldingsValue.subtract(totalInvested).setScale(2, RoundingMode.HALF_UP);
            BigDecimal profitLossPercent = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            if (totalInvested.compareTo(BigDecimal.ZERO) > 0) {
                profitLossPercent = totalProfitLoss.multiply(BigDecimal.valueOf(100))
                        .divide(totalInvested, 2, RoundingMode.HALF_UP);
            }

            return new PortfolioResponse(
                    totalInvested,
                    currentValue,
                    totalProfitLoss,
                    profitLossPercent,
                    holdingResponses,
                    cash,
                    totalHoldingsValue,
                    true,
                    "REAL_TIME"
            );
        } else {
            // Partial or unavailable valuation: DO NOT silently calculate an incorrect/distorted portfolio value
            String valuationStatus = (missingQuoteCount == holdings.size()) ? "UNAVAILABLE" : "PARTIALLY_VALUED";
            log.warn("Portfolio contains {} holding(s) with missing market quotes out of {}. Setting status to {}",
                    missingQuoteCount, holdings.size(), valuationStatus);

            return new PortfolioResponse(
                    totalInvested,   // Aggregate cost basis is still completely accurate from transactions
                    null,            // Current value cannot be determined reliably
                    null,            // Profit/loss cannot be determined reliably
                    null,            // Profit/loss % cannot be determined reliably
                    holdingResponses,
                    cash,
                    null,            // Holdings value cannot be determined reliably
                    false,           // Market data is not fully available
                    valuationStatus
            );
        }
    }

    @Override
    public HoldingResponse valuateHolding(Holding holding, BigDecimal currentPrice) {
        return valuateHolding(holding, currentPrice, null, null);
    }

    @Override
    public HoldingResponse valuateHolding(Holding holding, BigDecimal currentPrice, String marketStatus, String quoteTimestamp) {
        Stock stock = holding.getStock();
        int quantity = holding.getQuantity() != null ? holding.getQuantity() : 0;
        BigDecimal avgBuyPrice = holding.getAvgBuyPrice() != null
                ? holding.getAvgBuyPrice().setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        BigDecimal investedValue = avgBuyPrice.multiply(BigDecimal.valueOf(quantity)).setScale(2, RoundingMode.HALF_UP);

        if (currentPrice != null) {
            BigDecimal scaledCurrentPrice = currentPrice.setScale(2, RoundingMode.HALF_UP);
            BigDecimal currentValue = scaledCurrentPrice.multiply(BigDecimal.valueOf(quantity)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal profitLoss = currentValue.subtract(investedValue).setScale(2, RoundingMode.HALF_UP);

            BigDecimal profitLossPercent = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            if (investedValue.compareTo(BigDecimal.ZERO) > 0) {
                profitLossPercent = profitLoss.multiply(BigDecimal.valueOf(100))
                        .divide(investedValue, 2, RoundingMode.HALF_UP);
            }

            return new HoldingResponse(
                    stock != null ? stock.getId() : null,
                    stock != null ? stock.getSymbol() : null,
                    stock != null ? stock.getCompanyName() : null,
                    quantity,
                    avgBuyPrice,
                    scaledCurrentPrice,
                    investedValue,
                    currentValue,
                    profitLoss,
                    profitLossPercent,
                    true,
                    marketStatus,
                    quoteTimestamp
            );
        } else {
            // Market data unavailable for this holding
            return new HoldingResponse(
                    stock != null ? stock.getId() : null,
                    stock != null ? stock.getSymbol() : null,
                    stock != null ? stock.getCompanyName() : null,
                    quantity,
                    avgBuyPrice,
                    null,            // currentPrice
                    investedValue,
                    null,            // currentValue
                    null,            // profitLoss
                    null,            // profitLossPercent
                    false,           // marketDataAvailable
                    marketStatus != null ? marketStatus : "UNAVAILABLE",
                    null             // quoteTimestamp
            );
        }
    }

    @Override
    public BigDecimal calculateNewAverageBuyPrice(int existingQuantity, BigDecimal existingAvgPrice,
                                                 int addedQuantity, BigDecimal buyPrice) {
        if (addedQuantity <= 0) {
            return (existingAvgPrice != null ? existingAvgPrice : BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        }
        if (existingQuantity <= 0 || existingAvgPrice == null) {
            return (buyPrice != null ? buyPrice : BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal oldTotal = existingAvgPrice.multiply(BigDecimal.valueOf(existingQuantity));
        BigDecimal newTotal = buyPrice.multiply(BigDecimal.valueOf(addedQuantity));
        BigDecimal combinedTotal = oldTotal.add(newTotal);

        int totalQuantity = existingQuantity + addedQuantity;
        return combinedTotal.divide(BigDecimal.valueOf(totalQuantity), 2, RoundingMode.HALF_UP);
    }
}
