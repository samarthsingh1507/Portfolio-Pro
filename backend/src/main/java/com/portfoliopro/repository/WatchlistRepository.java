package com.portfoliopro.repository;

import com.portfoliopro.entity.Stock;
import com.portfoliopro.entity.User;
import com.portfoliopro.entity.WatchlistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WatchlistRepository extends JpaRepository<WatchlistItem, Long> {
    List<WatchlistItem> findByUserOrderByCreatedAtDesc(User user);
    Optional<WatchlistItem> findByUserAndStock(User user, Stock stock);
    boolean existsByUserAndStock(User user, Stock stock);
    void deleteByUserAndStock(User user, Stock stock);
}
