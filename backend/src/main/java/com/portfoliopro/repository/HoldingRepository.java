package com.portfoliopro.repository;

import com.portfoliopro.entity.Holding;
import com.portfoliopro.entity.Stock;
import com.portfoliopro.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HoldingRepository extends JpaRepository<Holding, Long> {
    List<Holding> findByUserOrderByStockSymbolAsc(User user);
    Optional<Holding> findByUserAndStock(User user, Stock stock);
    Optional<Holding> findByUserAndStockId(User user, Long stockId);
}
