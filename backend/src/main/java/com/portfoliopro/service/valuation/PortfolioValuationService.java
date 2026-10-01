package com.portfoliopro.service.valuation;

import com.portfoliopro.dto.HoldingResponse;
import com.portfoliopro.dto.PortfolioResponse;
import com.portfoliopro.entity.Holding;

import java.math.BigDecimal;
import java.util.List;

/**
 * Service dedicated to portfolio financial valuation, cost basis tracking,
 * and mark-to-market calculations using live/cached market data.
 */
public interface PortfolioValuationService {

    /**
     * Valuates a portfolio of holdings against current market quotes.
     * Incorporates cash balance into total portfolio value.
     *
     * @param holdings List of active holdings
     * @param availableCash Available uninvested cash balance
     * @return PortfolioResponse containing aggregate metrics and valued holdings
     */
    PortfolioResponse valuatePortfolio(List<Holding> holdings, BigDecimal availableCash);

    /**
     * Valuates a portfolio assuming zero cash balance.
     *
     * @param holdings List of active holdings
     * @return PortfolioResponse
     */
    default PortfolioResponse valuatePortfolio(List<Holding> holdings) {
        return valuatePortfolio(holdings, BigDecimal.ZERO);
    }

    /**
     * Valuates a single holding given its current market price.
     *
     * @param holding The holding entity
     * @param currentPrice Current market price (nullable if market data unavailable)
     * @return HoldingResponse with invested value, current value, and unrealized P/L
     */
    HoldingResponse valuateHolding(Holding holding, BigDecimal currentPrice);

    /**
     * Valuates a single holding with status and timestamp metadata.
     *
     * @param holding The holding entity
     * @param currentPrice Current market price (nullable)
     * @param marketStatus Market status (e.g. "OPEN", "CLOSED")
     * @param quoteTimestamp Timestamp of market quote
     * @return HoldingResponse
     */
    HoldingResponse valuateHolding(Holding holding, BigDecimal currentPrice, String marketStatus, String quoteTimestamp);

    /**
     * Computes the new weighted average buy price when purchasing additional shares.
     * Formula: ((existingQuantity * existingAvgPrice) + (addedQuantity * buyPrice)) / (existingQuantity + addedQuantity)
     *
     * @param existingQuantity current quantity owned
     * @param existingAvgPrice current weighted average cost basis
     * @param addedQuantity newly purchased quantity
     * @param buyPrice price of newly executed order
     * @return new weighted average cost basis scaled to 2 decimal places with HALF_UP rounding
     */
    BigDecimal calculateNewAverageBuyPrice(int existingQuantity, BigDecimal existingAvgPrice, int addedQuantity, BigDecimal buyPrice);
}
