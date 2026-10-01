package com.portfoliopro.controller;

import com.portfoliopro.dto.ApiResponse;
import com.portfoliopro.dto.WatchlistResponse;
import com.portfoliopro.service.WatchlistService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/watchlist")
public class WatchlistController {

    private final WatchlistService watchlistService;

    public WatchlistController(WatchlistService watchlistService) {
        this.watchlistService = watchlistService;
    }

    @GetMapping
    public ResponseEntity<List<WatchlistResponse>> getWatchlist(Principal principal) {
        List<WatchlistResponse> items = watchlistService.getWatchlist(principal.getName());
        return ResponseEntity.ok(items);
    }

    @PostMapping("/{stockId}")
    public ResponseEntity<ApiResponse> addToWatchlist(@PathVariable Long stockId, Principal principal) {
        ApiResponse response = watchlistService.addToWatchlist(stockId, principal.getName());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{stockId}")
    public ResponseEntity<ApiResponse> removeFromWatchlist(@PathVariable Long stockId, Principal principal) {
        ApiResponse response = watchlistService.removeFromWatchlist(stockId, principal.getName());
        return ResponseEntity.ok(response);
    }
}
