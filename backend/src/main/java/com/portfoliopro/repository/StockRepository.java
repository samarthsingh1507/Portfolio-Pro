package com.portfoliopro.repository;

import com.portfoliopro.entity.Stock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockRepository extends JpaRepository<Stock, Long> {
    Optional<Stock> findBySymbolIgnoreCase(String symbol);
    Optional<Stock> findBySymbol(String symbol);
    List<Stock> findAllByOrderBySymbolAsc();
    boolean existsBySymbol(String symbol);
}
