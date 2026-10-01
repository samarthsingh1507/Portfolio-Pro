package com.portfoliopro.service;

import com.portfoliopro.dto.ApiResponse;
import com.portfoliopro.dto.WatchlistResponse;
import com.portfoliopro.entity.Stock;
import com.portfoliopro.entity.User;
import com.portfoliopro.entity.WatchlistItem;
import com.portfoliopro.exception.ResourceNotFoundException;
import com.portfoliopro.repository.StockRepository;
import com.portfoliopro.repository.UserRepository;
import com.portfoliopro.repository.WatchlistRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class WatchlistService {

    private final WatchlistRepository watchlistRepository;
    private final StockRepository stockRepository;
    private final UserRepository userRepository;

    public WatchlistService(WatchlistRepository watchlistRepository,
                            StockRepository stockRepository,
                            UserRepository userRepository) {
        this.watchlistRepository = watchlistRepository;
        this.stockRepository = stockRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<WatchlistResponse> getWatchlist(String username) {
        User user = getUser(username);
        return watchlistRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(this::mapToWatchlistResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ApiResponse addToWatchlist(Long stockId, String username) {
        User user = getUser(username);
        Stock stock = stockRepository.findById(stockId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock not found with id: " + stockId));

        if (!watchlistRepository.existsByUserAndStock(user, stock)) {
            WatchlistItem item = new WatchlistItem(user, stock);
            watchlistRepository.save(item);
        }

        return new ApiResponse(true, "Stock " + stock.getSymbol() + " added to watchlist");
    }

    @Transactional
    public ApiResponse removeFromWatchlist(Long stockId, String username) {
        User user = getUser(username);
        Stock stock = stockRepository.findById(stockId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock not found with id: " + stockId));

        Optional<WatchlistItem> item = watchlistRepository.findByUserAndStock(user, stock);
        item.ifPresent(watchlistRepository::delete);

        return new ApiResponse(true, "Stock " + stock.getSymbol() + " removed from watchlist");
    }

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
    }

    private WatchlistResponse mapToWatchlistResponse(WatchlistItem item) {
        Stock stock = item.getStock();
        return new WatchlistResponse(
                item.getId(),
                stock.getId(),
                stock.getSymbol(),
                stock.getCompanyName(),
                stock.getPrice(),
                stock.getSector(),
                stock.getPeRatio(),
                item.getCreatedAt()
        );
    }
}
