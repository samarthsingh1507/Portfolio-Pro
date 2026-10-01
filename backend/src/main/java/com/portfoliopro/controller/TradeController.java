package com.portfoliopro.controller;

import com.portfoliopro.dto.OrderRequest;
import com.portfoliopro.dto.OrderResponse;
import com.portfoliopro.service.TradeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class TradeController {

    private final TradeService tradeService;

    public TradeController(TradeService tradeService) {
        this.tradeService = tradeService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> placeOrder(@Valid @RequestBody OrderRequest request, Principal principal) {
        OrderResponse response = tradeService.executeOrder(request, principal.getName());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getOrderHistory(Principal principal) {
        List<OrderResponse> orders = tradeService.getOrderHistory(principal.getName());
        return ResponseEntity.ok(orders);
    }
}
