package com.portfoliopro.service;

import com.portfoliopro.dto.OrderRequest;
import com.portfoliopro.dto.OrderResponse;
import com.portfoliopro.entity.Holding;
import com.portfoliopro.entity.Order;
import com.portfoliopro.entity.Stock;
import com.portfoliopro.entity.User;
import com.portfoliopro.exception.BadRequestException;
import com.portfoliopro.repository.HoldingRepository;
import com.portfoliopro.repository.OrderRepository;
import com.portfoliopro.repository.StockRepository;
import com.portfoliopro.repository.UserRepository;
import com.portfoliopro.service.valuation.PortfolioValuationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TradeServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private HoldingRepository holdingRepository;

    @Mock
    private StockRepository stockRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PortfolioValuationService portfolioValuationService;

    @InjectMocks
    private TradeService tradeService;

    private User demoUser;
    private Stock aaplStock;

    @BeforeEach
    void setUp() {
        demoUser = new User("demo", "demo@portfoliopro.com", "pass");
        demoUser.setId(1L);

        aaplStock = new Stock("AAPL", "Apple Inc.", new BigDecimal("225.50"), "Technology", 3400000000000L, new BigDecimal("6.42"), new BigDecimal("35.12"));
        aaplStock.setId(1L);

        when(userRepository.findByUsername("demo")).thenReturn(Optional.of(demoUser));
        when(stockRepository.findById(1L)).thenReturn(Optional.of(aaplStock));
    }

    @Test
    void testBuyFirstTimeCreatesNewHolding() {
        when(holdingRepository.findByUserAndStock(demoUser, aaplStock)).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order o = invocation.getArgument(0);
            o.setId(100L);
            return o;
        });

        OrderRequest request = new OrderRequest(1L, "BUY", 5, new BigDecimal("200.00"));
        OrderResponse response = tradeService.executeOrder(request, "demo");

        assertNotNull(response);
        assertEquals("BUY", response.getType());
        assertEquals(5, response.getQuantity());
        assertEquals(new BigDecimal("200.00"), response.getPrice());
        assertEquals(new BigDecimal("1000.00"), response.getTotalValue());
        assertEquals("EXECUTED", response.getStatus());

        ArgumentCaptor<Holding> captor = ArgumentCaptor.forClass(Holding.class);
        verify(holdingRepository).save(captor.capture());
        Holding savedHolding = captor.getValue();
        assertEquals(5, savedHolding.getQuantity());
        assertEquals(new BigDecimal("200.00"), savedHolding.getAvgBuyPrice());
    }

    @Test
    void testBuySecondTimeCalculatesWeightedAverage() {
        Holding existingHolding = new Holding(demoUser, aaplStock, 5, new BigDecimal("200.00"));
        when(holdingRepository.findByUserAndStock(demoUser, aaplStock)).thenReturn(Optional.of(existingHolding));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order o = invocation.getArgument(0);
            o.setId(101L);
            return o;
        });
        // Stub: (5 * 200 + 5 * 250) / 10 = 225.00
        when(portfolioValuationService.calculateNewAverageBuyPrice(5, new BigDecimal("200.00"), 5, new BigDecimal("250.00")))
                .thenReturn(new BigDecimal("225.00"));

        // Buy 5 shares at 250.00. Expected average: (5 * 200 + 5 * 250) / 10 = 225.00
        OrderRequest request = new OrderRequest(1L, "BUY", 5, new BigDecimal("250.00"));
        OrderResponse response = tradeService.executeOrder(request, "demo");

        assertNotNull(response);
        assertEquals("BUY", response.getType());
        assertEquals(5, response.getQuantity());
        assertEquals(new BigDecimal("250.00"), response.getPrice());

        verify(holdingRepository).save(existingHolding);
        assertEquals(10, existingHolding.getQuantity());
        assertEquals(new BigDecimal("225.00"), existingHolding.getAvgBuyPrice());
    }

    @Test
    void testSellPartialQuantityReducesHolding() {
        Holding existingHolding = new Holding(demoUser, aaplStock, 10, new BigDecimal("225.00"));
        when(holdingRepository.findByUserAndStock(demoUser, aaplStock)).thenReturn(Optional.of(existingHolding));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order o = invocation.getArgument(0);
            o.setId(102L);
            return o;
        });

        // Sell 3 shares
        OrderRequest request = new OrderRequest(1L, "SELL", 3, new BigDecimal("230.00"));
        OrderResponse response = tradeService.executeOrder(request, "demo");

        assertNotNull(response);
        assertEquals("SELL", response.getType());
        assertEquals(3, response.getQuantity());
        assertEquals("EXECUTED", response.getStatus());

        verify(holdingRepository).save(existingHolding);
        assertEquals(7, existingHolding.getQuantity());
        verify(holdingRepository, never()).delete(any(Holding.class));
    }

    @Test
    void testSellFullQuantityDeletesHolding() {
        Holding existingHolding = new Holding(demoUser, aaplStock, 7, new BigDecimal("225.00"));
        when(holdingRepository.findByUserAndStock(demoUser, aaplStock)).thenReturn(Optional.of(existingHolding));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order o = invocation.getArgument(0);
            o.setId(103L);
            return o;
        });

        // Sell remaining 7 shares
        OrderRequest request = new OrderRequest(1L, "SELL", 7, new BigDecimal("235.00"));
        OrderResponse response = tradeService.executeOrder(request, "demo");

        assertNotNull(response);
        assertEquals("SELL", response.getType());
        assertEquals(7, response.getQuantity());

        verify(holdingRepository).delete(existingHolding);
    }

    @Test
    void testSellMoreThanOwnedThrowsBadRequest() {
        Holding existingHolding = new Holding(demoUser, aaplStock, 5, new BigDecimal("200.00"));
        when(holdingRepository.findByUserAndStock(demoUser, aaplStock)).thenReturn(Optional.of(existingHolding));

        OrderRequest request = new OrderRequest(1L, "SELL", 10, new BigDecimal("230.00"));
        BadRequestException ex = assertThrows(BadRequestException.class, () -> tradeService.executeOrder(request, "demo"));

        assertTrue(ex.getMessage().contains("Insufficient holding quantity"));
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void testSellWhenNoHoldingThrowsBadRequest() {
        when(holdingRepository.findByUserAndStock(demoUser, aaplStock)).thenReturn(Optional.empty());

        OrderRequest request = new OrderRequest(1L, "SELL", 5, new BigDecimal("230.00"));
        BadRequestException ex = assertThrows(BadRequestException.class, () -> tradeService.executeOrder(request, "demo"));

        assertTrue(ex.getMessage().contains("do not own any shares"));
        verify(orderRepository, never()).save(any(Order.class));
    }
}
