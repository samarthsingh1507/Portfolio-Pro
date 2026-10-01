package com.portfoliopro.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "price_history", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"stock_id", "date"})
})
public class PriceHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_id", nullable = false)
    private Stock stock;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "close_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal closePrice;

    public PriceHistory() {
    }

    public PriceHistory(Stock stock, LocalDate date, BigDecimal closePrice) {
        this.stock = stock;
        this.date = date;
        this.closePrice = closePrice;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Stock getStock() {
        return stock;
    }

    public void setStock(Stock stock) {
        this.stock = stock;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public BigDecimal getClosePrice() {
        return closePrice;
    }

    public void setClosePrice(BigDecimal closePrice) {
        this.closePrice = closePrice;
    }
}
