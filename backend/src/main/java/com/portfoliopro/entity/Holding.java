package com.portfoliopro.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "holdings", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "stock_id"})
})
public class Holding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "stock_id", nullable = false)
    private Stock stock;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "avg_buy_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal avgBuyPrice;

    public Holding() {
    }

    public Holding(User user, Stock stock, Integer quantity, BigDecimal avgBuyPrice) {
        this.user = user;
        this.stock = stock;
        this.quantity = quantity;
        this.avgBuyPrice = avgBuyPrice;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Stock getStock() {
        return stock;
    }

    public void setStock(Stock stock) {
        this.stock = stock;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getAvgBuyPrice() {
        return avgBuyPrice;
    }

    public void setAvgBuyPrice(BigDecimal avgBuyPrice) {
        this.avgBuyPrice = avgBuyPrice;
    }
}
