package com.portfoliopro.service;

import com.portfoliopro.dto.OrderRequest;
import com.portfoliopro.dto.OrderResponse;
import com.portfoliopro.entity.Holding;
import com.portfoliopro.entity.Order;
import com.portfoliopro.entity.Stock;
import com.portfoliopro.entity.User;
import com.portfoliopro.exception.BadRequestException;
import com.portfoliopro.exception.ResourceNotFoundException;
import com.portfoliopro.repository.HoldingRepository;
import com.portfoliopro.repository.OrderRepository;
import com.portfoliopro.repository.StockRepository;
import com.portfoliopro.repository.UserRepository;
import com.portfoliopro.service.valuation.PortfolioValuationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class TradeService {

    private final OrderRepository orderRepository;
    private final HoldingRepository holdingRepository;
    private final StockRepository stockRepository;
    private final UserRepository userRepository;
    private final PortfolioValuationService portfolioValuationService;

    public TradeService(OrderRepository orderRepository,
                        HoldingRepository holdingRepository,
                        StockRepository stockRepository,
                        UserRepository userRepository,
                        PortfolioValuationService portfolioValuationService) {
        this.orderRepository = orderRepository;
        this.holdingRepository = holdingRepository;
        this.stockRepository = stockRepository;
        this.userRepository = userRepository;
        this.portfolioValuationService = portfolioValuationService;
    }

    @Transactional
    public OrderResponse executeOrder(OrderRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));

        Stock stock = stockRepository.findById(request.getStockId())
                .orElseThrow(() -> new ResourceNotFoundException("Stock not found with id: " + request.getStockId()));

        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new BadRequestException("Order quantity must be greater than zero");
        }

        if (request.getPrice() == null || request.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Order price must be greater than zero");
        }

        String orderType = request.getType().trim().toUpperCase();
        if (!"BUY".equals(orderType) && !"SELL".equals(orderType)) {
            throw new BadRequestException("Invalid order type: " + request.getType() + ". Must be BUY or SELL");
        }

        if ("BUY".equals(orderType)) {
            executeBuyOrder(user, stock, request.getQuantity(), request.getPrice());
        } else {
            executeSellOrder(user, stock, request.getQuantity(), request.getPrice());
        }

        // Create executed order record
        Order order = new Order(
                user,
                stock,
                orderType,
                request.getQuantity(),
                request.getPrice(),
                "EXECUTED"
        );
        order = orderRepository.save(order);

        BigDecimal totalValue = request.getPrice().multiply(BigDecimal.valueOf(request.getQuantity())).setScale(2, RoundingMode.HALF_UP);

        return new OrderResponse(
                order.getId(),
                stock.getId(),
                stock.getSymbol(),
                stock.getCompanyName(),
                order.getType(),
                order.getQuantity(),
                order.getPrice(),
                totalValue,
                order.getStatus(),
                order.getCreatedAt()
        );
    }

    private void executeBuyOrder(User user, Stock stock, Integer quantity, BigDecimal price) {
        Optional<Holding> existingHoldingOpt = holdingRepository.findByUserAndStock(user, stock);

        if (existingHoldingOpt.isEmpty()) {
            Holding newHolding = new Holding(user, stock, quantity, price.setScale(2, RoundingMode.HALF_UP));
            holdingRepository.save(newHolding);
        } else {
            Holding holding = existingHoldingOpt.get();
            int oldQuantity = holding.getQuantity();
            BigDecimal oldAvg = holding.getAvgBuyPrice();

            int newQuantity = oldQuantity + quantity;
            BigDecimal newAverage = portfolioValuationService.calculateNewAverageBuyPrice(
                    oldQuantity, oldAvg, quantity, price);

            holding.setQuantity(newQuantity);
            holding.setAvgBuyPrice(newAverage);
            holdingRepository.save(holding);
        }
    }

    private void executeSellOrder(User user, Stock stock, Integer quantity, BigDecimal price) {
        Optional<Holding> existingHoldingOpt = holdingRepository.findByUserAndStock(user, stock);

        if (existingHoldingOpt.isEmpty() || existingHoldingOpt.get().getQuantity() <= 0) {
            throw new BadRequestException("You do not own any shares of " + stock.getSymbol());
        }

        Holding holding = existingHoldingOpt.get();
        if (quantity > holding.getQuantity()) {
            throw new BadRequestException("Insufficient holding quantity. You own " + holding.getQuantity() +
                    " shares, but attempted to sell " + quantity);
        }

        int remainingQuantity = holding.getQuantity() - quantity;
        if (remainingQuantity == 0) {
            holdingRepository.delete(holding);
        } else {
            holding.setQuantity(remainingQuantity);
            holdingRepository.save(holding);
        }
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrderHistory(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));

        return orderRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(this::mapToOrderResponse)
                .collect(Collectors.toList());
    }

    private OrderResponse mapToOrderResponse(Order order) {
        Stock stock = order.getStock();
        BigDecimal totalValue = order.getPrice().multiply(BigDecimal.valueOf(order.getQuantity())).setScale(2, RoundingMode.HALF_UP);

        return new OrderResponse(
                order.getId(),
                stock.getId(),
                stock.getSymbol(),
                stock.getCompanyName(),
                order.getType(),
                order.getQuantity(),
                order.getPrice(),
                totalValue,
                order.getStatus(),
                order.getCreatedAt()
        );
    }
}
