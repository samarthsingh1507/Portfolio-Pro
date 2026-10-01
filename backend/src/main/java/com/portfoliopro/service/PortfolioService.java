package com.portfoliopro.service;

import com.portfoliopro.dto.AllocationItemDto;
import com.portfoliopro.dto.HoldingResponse;
import com.portfoliopro.dto.PortfolioAnalyticsResponse;
import com.portfoliopro.dto.PortfolioResponse;
import com.portfoliopro.dto.PortfolioSummaryResponse;
import com.portfoliopro.entity.Holding;
import com.portfoliopro.entity.User;
import com.portfoliopro.exception.ResourceNotFoundException;
import com.portfoliopro.repository.HoldingRepository;
import com.portfoliopro.repository.UserRepository;
import com.portfoliopro.service.valuation.PortfolioValuationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
public class PortfolioService {

    private final HoldingRepository holdingRepository;
    private final UserRepository userRepository;
    private final PortfolioValuationService portfolioValuationService;

    public PortfolioService(HoldingRepository holdingRepository,
                            UserRepository userRepository,
                            PortfolioValuationService portfolioValuationService) {
        this.holdingRepository = holdingRepository;
        this.userRepository = userRepository;
        this.portfolioValuationService = portfolioValuationService;
    }

    @Transactional(readOnly = true)
    public PortfolioResponse getPortfolio(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));

        List<Holding> holdings = holdingRepository.findByUserOrderByStockSymbolAsc(user);
        BigDecimal availableCash = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        return portfolioValuationService.valuatePortfolio(holdings, availableCash);
    }

    @Transactional(readOnly = true)
    public PortfolioSummaryResponse getPortfolioSummary(String username) {
        PortfolioResponse portfolio = getPortfolio(username);
        return new PortfolioSummaryResponse(
                portfolio.getTotalInvested(),
                portfolio.getCurrentValue(),
                portfolio.getTotalProfitLoss(),
                portfolio.getProfitLossPercent(),
                portfolio.getAvailableCash(),
                portfolio.getMarketDataAvailable(),
                portfolio.getValuationStatus()
        );
    }

    @Transactional(readOnly = true)
    public PortfolioAnalyticsResponse getPortfolioAnalytics(String username) {
        PortfolioResponse portfolio = getPortfolio(username);

        BigDecimal totalInvested = portfolio.getTotalInvested();
        BigDecimal currentValue = portfolio.getCurrentValue();
        BigDecimal totalProfitLoss = portfolio.getTotalProfitLoss();
        BigDecimal profitLossPercent = portfolio.getProfitLossPercent();
        List<HoldingResponse> holdings = portfolio.getHoldings();
        int numberOfHoldings = holdings.size();

        List<AllocationItemDto> allocation = new ArrayList<>();
        if (currentValue != null && currentValue.compareTo(BigDecimal.ZERO) > 0) {
            for (HoldingResponse h : holdings) {
                if (h.getCurrentValue() != null) {
                    BigDecimal pct = h.getCurrentValue()
                            .multiply(BigDecimal.valueOf(100))
                            .divide(currentValue, 2, RoundingMode.HALF_UP);
                    allocation.add(new AllocationItemDto(h.getSymbol(), pct, h.getCompanyName(), h.getCurrentValue()));
                } else {
                    allocation.add(new AllocationItemDto(h.getSymbol(), BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), h.getCompanyName(), BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)));
                }
            }
        } else {
            for (HoldingResponse h : holdings) {
                allocation.add(new AllocationItemDto(h.getSymbol(), BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), h.getCompanyName(), BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)));
            }
        }

        String diversification;
        String riskIndicator;

        if (numberOfHoldings == 0) {
            diversification = "No Holdings";
            riskIndicator = "No Exposure";
        } else if (numberOfHoldings == 1) {
            diversification = "Low Diversification";
            riskIndicator = "High Concentration";
        } else if (numberOfHoldings <= 3) {
            diversification = "Moderate Diversification";
            riskIndicator = "Moderate Concentration";
        } else {
            diversification = "Higher Diversification";
            riskIndicator = "Lower Concentration";
        }

        return new PortfolioAnalyticsResponse(
                totalInvested,
                currentValue,
                totalProfitLoss,
                profitLossPercent,
                numberOfHoldings,
                allocation,
                diversification,
                riskIndicator
        );
    }
}
