package com.portfoliopro.repository;

import com.portfoliopro.entity.PriceHistory;
import com.portfoliopro.entity.Stock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PriceHistoryRepository extends JpaRepository<PriceHistory, Long> {
    List<PriceHistory> findByStockOrderByDateAsc(Stock stock);
    List<PriceHistory> findByStockIdOrderByDateAsc(Long stockId);
}
