package com.portfoliopro.service;

import com.portfoliopro.dto.ApiResponse;
import com.portfoliopro.dto.StockDetailResponse;
import com.portfoliopro.dto.StockResponse;
import com.portfoliopro.dto.WatchlistResponse;
import com.portfoliopro.entity.Stock;
import com.portfoliopro.entity.User;
import com.portfoliopro.entity.WatchlistItem;
import com.portfoliopro.exception.ResourceNotFoundException;
import com.portfoliopro.repository.PriceHistoryRepository;
import com.portfoliopro.repository.StockRepository;
import com.portfoliopro.repository.UserRepository;
import com.portfoliopro.repository.WatchlistRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class MarketAndWatchlistServiceTest {

    @Mock
    private StockRepository stockRepository;

    @Mock
    private PriceHistoryRepository priceHistoryRepository;

    @Mock
    private WatchlistRepository watchlistRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private MarketService marketService;

    private WatchlistService watchlistService;

    private Stock appleStock;
    private User demoUser;

    @BeforeEach
    void setUp() {
        watchlistService = new WatchlistService(watchlistRepository, stockRepository, userRepository);
        appleStock = new Stock("AAPL", "Apple Inc.", new BigDecimal("225.50"), "Technology", 3400000000000L, new BigDecimal("6.42"), new BigDecimal("35.12"));
        appleStock.setId(1L);

        demoUser = new User("demo", "demo@portfoliopro.com", "hash");
        demoUser.setId(1L);
    }

    @Test
    void testGetAllStocks() {
        when(stockRepository.findAllByOrderBySymbolAsc()).thenReturn(List.of(appleStock));

        List<StockResponse> stocks = marketService.getAllStocks();

        assertNotNull(stocks);
        assertEquals(1, stocks.size());
        assertEquals("AAPL", stocks.get(0).getSymbol());
        assertEquals(new BigDecimal("225.50"), stocks.get(0).getPrice());
    }

    @Test
    void testGetStockDetailSuccess() {
        when(stockRepository.findBySymbolIgnoreCase("AAPL")).thenReturn(Optional.of(appleStock));
        when(userRepository.findByUsername("demo")).thenReturn(Optional.of(demoUser));
        when(watchlistRepository.existsByUserAndStock(demoUser, appleStock)).thenReturn(true);

        StockDetailResponse detail = marketService.getStockDetail("AAPL", "demo");

        assertNotNull(detail);
        assertEquals("AAPL", detail.getSymbol());
        assertEquals("Apple Inc.", detail.getCompanyName());
        assertTrue(detail.isInWatchlist());
    }

    @Test
    void testGetStockDetailNotFound_BlankSymbol() {
        assertThrows(ResourceNotFoundException.class, () -> marketService.getStockDetail("", null));
    }

    @Test
    void testGetStockDetail_DynamicCreation() {
        when(stockRepository.findBySymbolIgnoreCase("XYZ")).thenReturn(Optional.empty());
        StockDetailResponse detail = marketService.getStockDetail("XYZ", null);
        assertNotNull(detail);
        assertEquals("XYZ", detail.getSymbol());
    }

    @Test
    void testAddToWatchlist() {
        when(userRepository.findByUsername("demo")).thenReturn(Optional.of(demoUser));
        when(stockRepository.findById(1L)).thenReturn(Optional.of(appleStock));
        when(watchlistRepository.existsByUserAndStock(demoUser, appleStock)).thenReturn(false);

        ApiResponse response = watchlistService.addToWatchlist(1L, "demo");

        assertTrue(response.isSuccess());
        verify(watchlistRepository).save(any(WatchlistItem.class));
    }

    @Test
    void testRemoveFromWatchlist() {
        WatchlistItem item = new WatchlistItem(demoUser, appleStock);
        when(userRepository.findByUsername("demo")).thenReturn(Optional.of(demoUser));
        when(stockRepository.findById(1L)).thenReturn(Optional.of(appleStock));
        when(watchlistRepository.findByUserAndStock(demoUser, appleStock)).thenReturn(Optional.of(item));

        ApiResponse response = watchlistService.removeFromWatchlist(1L, "demo");

        assertTrue(response.isSuccess());
        verify(watchlistRepository).delete(item);
    }

    @Test
    void testGetWatchlist() {
        WatchlistItem item = new WatchlistItem(demoUser, appleStock);
        item.setId(10L);
        when(userRepository.findByUsername("demo")).thenReturn(Optional.of(demoUser));
        when(watchlistRepository.findByUserOrderByCreatedAtDesc(demoUser)).thenReturn(List.of(item));

        List<WatchlistResponse> list = watchlistService.getWatchlist("demo");

        assertEquals(1, list.size());
        assertEquals("AAPL", list.get(0).getSymbol());
        assertEquals(1L, list.get(0).getStockId());
    }
}
