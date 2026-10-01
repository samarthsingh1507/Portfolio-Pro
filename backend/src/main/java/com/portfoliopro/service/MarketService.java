package com.portfoliopro.service;

import com.portfoliopro.dto.StockDetailResponse;
import com.portfoliopro.dto.StockResponse;
import com.portfoliopro.entity.PriceHistory;
import com.portfoliopro.entity.Stock;
import com.portfoliopro.entity.User;
import com.portfoliopro.exception.ResourceNotFoundException;
import com.portfoliopro.repository.PriceHistoryRepository;
import com.portfoliopro.repository.StockRepository;
import com.portfoliopro.repository.UserRepository;
import com.portfoliopro.repository.WatchlistRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class MarketService {

    private final StockRepository stockRepository;
    private final PriceHistoryRepository priceHistoryRepository;
    private final WatchlistRepository watchlistRepository;
    private final UserRepository userRepository;

    public MarketService(StockRepository stockRepository,
                         PriceHistoryRepository priceHistoryRepository,
                         WatchlistRepository watchlistRepository,
                         UserRepository userRepository) {
        this.stockRepository = stockRepository;
        this.priceHistoryRepository = priceHistoryRepository;
        this.watchlistRepository = watchlistRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<StockResponse> getAllStocks() {
        return stockRepository.findAllByOrderBySymbolAsc().stream()
                .map(this::mapToStockResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StockDetailResponse getStockDetail(String symbol, String username) {
        Stock stock = stockRepository.findBySymbolIgnoreCase(symbol.trim())
                .orElseGet(() -> findOrCreateStock(symbol));

        boolean inWatchlist = false;
        if (username != null) {
            Optional<User> userOpt = userRepository.findByUsername(username);
            if (userOpt.isPresent()) {
                inWatchlist = watchlistRepository.existsByUserAndStock(userOpt.get(), stock);
            }
        }

        return new StockDetailResponse(
                stock.getId(),
                stock.getSymbol(),
                stock.getCompanyName(),
                stock.getPrice(),
                stock.getSector(),
                stock.getMarketCap(),
                stock.getEps(),
                stock.getPeRatio(),
                inWatchlist
        );
    }

    @Transactional
    public Stock findOrCreateStock(String rawSymbol) {
        if (rawSymbol == null || rawSymbol.trim().isEmpty()) {
            throw new ResourceNotFoundException("Symbol must not be blank");
        }
        String sym = rawSymbol.trim().toUpperCase();
        return stockRepository.findBySymbolIgnoreCase(sym).orElseGet(() -> {
            boolean isForex = sym.contains("/");
            String name = isForex ? sym + " Currency Pair" : sym + " Corporation";
            String sector = isForex ? "Foreign Exchange / Forex" : "Global Equities";
            BigDecimal defaultPrice = isForex ? new BigDecimal("1.2500") : new BigDecimal("150.00");
            Long marketCap = isForex ? 0L : 75000000000L;
            BigDecimal eps = isForex ? BigDecimal.ZERO : new BigDecimal("4.20");
            BigDecimal peRatio = isForex ? BigDecimal.ZERO : new BigDecimal("24.50");

            Stock newStock = new Stock(sym, name, defaultPrice, sector, marketCap, eps, peRatio);
            try {
                Stock saved = stockRepository.save(newStock);
                return saved != null ? saved : newStock;
            } catch (Exception ex) {
                return newStock;
            }
        });
    }

    private StockResponse mapToStockResponse(Stock stock) {
        return new StockResponse(
                stock.getId(),
                stock.getSymbol(),
                stock.getCompanyName(),
                stock.getPrice(),
                stock.getSector(),
                stock.getMarketCap(),
                stock.getEps(),
                stock.getPeRatio()
        );
    }

    @PostConstruct
    @Transactional
    public void seedInitialMarketDataIfEmpty() {
        List<Stock> allInstruments = List.of(
                // Mega-Cap US Tech & AI
                new Stock("AAPL", "Apple Inc.", new BigDecimal("329.40"), "Technology", 3450000000000L, new BigDecimal("6.42"), new BigDecimal("35.12")),
                new Stock("MSFT", "Microsoft Corporation", new BigDecimal("508.96"), "Technology", 3180000000000L, new BigDecimal("11.80"), new BigDecimal("36.28")),
                new Stock("NVDA", "NVIDIA Corporation", new BigDecimal("227.21"), "Semiconductors & AI", 2980000000000L, new BigDecimal("1.85"), new BigDecimal("65.83")),
                new Stock("GOOGL", "Alphabet Inc.", new BigDecimal("340.92"), "Communication Services", 2060000000000L, new BigDecimal("6.70"), new BigDecimal("24.73")),
                new Stock("AMZN", "Amazon.com Inc.", new BigDecimal("246.67"), "Consumer Cyclical", 1940000000000L, new BigDecimal("4.18"), new BigDecimal("44.59")),
                new Stock("META", "Meta Platforms Inc.", new BigDecimal("568.90"), "Communication Services", 1440000000000L, new BigDecimal("19.45"), new BigDecimal("29.24")),
                new Stock("TSLA", "Tesla Inc.", new BigDecimal("352.84"), "Consumer Cyclical", 810000000000L, new BigDecimal("2.15"), new BigDecimal("118.27")),
                new Stock("AVGO", "Broadcom Inc.", new BigDecimal("168.50"), "Semiconductors", 780000000000L, new BigDecimal("12.25"), new BigDecimal("34.10")),
                new Stock("ORCL", "Oracle Corporation", new BigDecimal("174.20"), "Technology", 480000000000L, new BigDecimal("4.80"), new BigDecimal("36.30")),
                new Stock("AMD", "Advanced Micro Devices", new BigDecimal("158.40"), "Semiconductors", 256000000000L, new BigDecimal("1.25"), new BigDecimal("126.70")),
                new Stock("ADBE", "Adobe Inc.", new BigDecimal("512.60"), "Technology", 230000000000L, new BigDecimal("12.40"), new BigDecimal("41.30")),
                new Stock("CRM", "Salesforce Inc.", new BigDecimal("275.30"), "Technology", 265000000000L, new BigDecimal("5.60"), new BigDecimal("49.10")),
                new Stock("NFLX", "Netflix Inc.", new BigDecimal("705.80"), "Entertainment & Media", 304000000000L, new BigDecimal("17.80"), new BigDecimal("39.60")),
                new Stock("PLTR", "Palantir Technologies", new BigDecimal("37.80"), "Technology & AI", 84000000000L, new BigDecimal("0.28"), new BigDecimal("135.00")),
                new Stock("UBER", "Uber Technologies Inc.", new BigDecimal("74.50"), "Technology & Mobility", 155000000000L, new BigDecimal("1.80"), new BigDecimal("41.40")),
                new Stock("COIN", "Coinbase Global Inc.", new BigDecimal("185.30"), "Fintech & Crypto", 45000000000L, new BigDecimal("4.60"), new BigDecimal("40.20")),

                // Major Global Leaders & Emerging Tech
                new Stock("TSM", "Taiwan Semiconductor ADR", new BigDecimal("175.40"), "Semiconductors", 910000000000L, new BigDecimal("6.20"), new BigDecimal("28.30")),
                new Stock("ASML", "ASML Holding N.V. ADR", new BigDecimal("780.20"), "Semiconductor Equipment", 310000000000L, new BigDecimal("18.90"), new BigDecimal("41.20")),
                new Stock("BABA", "Alibaba Group Holding Ltd.", new BigDecimal("107.74"), "Global E-Commerce", 255000000000L, new BigDecimal("6.10"), new BigDecimal("17.66")),
                new Stock("SONY", "Sony Group Corporation ADR", new BigDecimal("92.30"), "Consumer Electronics", 114000000000L, new BigDecimal("5.40"), new BigDecimal("17.10")),
                new Stock("NVO", "Novo Nordisk A/S ADR", new BigDecimal("122.50"), "Healthcare & Biotech", 540000000000L, new BigDecimal("3.80"), new BigDecimal("32.20")),
                new Stock("SAP", "SAP SE ADR", new BigDecimal("218.40"), "Enterprise Software", 255000000000L, new BigDecimal("5.10"), new BigDecimal("42.80")),
                new Stock("TM", "Toyota Motor Corp ADR", new BigDecimal("184.20"), "Automotive", 248000000000L, new BigDecimal("22.50"), new BigDecimal("8.18")),

                // Major Finance, Banking & Payments
                new Stock("JPM", "JPMorgan Chase & Co.", new BigDecimal("212.10"), "Financial Services", 605000000000L, new BigDecimal("17.20"), new BigDecimal("12.33")),
                new Stock("V", "Visa Inc.", new BigDecimal("274.50"), "Financial Services", 560000000000L, new BigDecimal("9.80"), new BigDecimal("28.00")),
                new Stock("MA", "Mastercard Inc.", new BigDecimal("482.10"), "Financial Services", 448000000000L, new BigDecimal("12.90"), new BigDecimal("37.30")),
                new Stock("BAC", "Bank of America Corp.", new BigDecimal("39.80"), "Financial Services", 310000000000L, new BigDecimal("3.20"), new BigDecimal("12.40")),
                new Stock("GS", "Goldman Sachs Group Inc.", new BigDecimal("492.60"), "Investment Banking", 162000000000L, new BigDecimal("34.50"), new BigDecimal("14.28")),

                // Major Healthcare & Pharmaceuticals
                new Stock("LLY", "Eli Lilly and Company", new BigDecimal("895.40"), "Healthcare & Pharma", 850000000000L, new BigDecimal("14.20"), new BigDecimal("63.00")),
                new Stock("UNH", "UnitedHealth Group Inc.", new BigDecimal("578.30"), "Healthcare Plans", 532000000000L, new BigDecimal("25.80"), new BigDecimal("22.40")),
                new Stock("JNJ", "Johnson & Johnson", new BigDecimal("162.40"), "Pharmaceuticals", 390000000000L, new BigDecimal("8.10"), new BigDecimal("20.00")),
                new Stock("ABBV", "AbbVie Inc.", new BigDecimal("192.50"), "Biotechnology", 340000000000L, new BigDecimal("11.40"), new BigDecimal("16.80")),

                // Major Retail & Consumer Giants
                new Stock("WMT", "Walmart Inc.", new BigDecimal("80.20"), "Consumer Defensive", 645000000000L, new BigDecimal("2.45"), new BigDecimal("32.70")),
                new Stock("COST", "Costco Wholesale Corp.", new BigDecimal("895.10"), "Consumer Defensive", 398000000000L, new BigDecimal("16.20"), new BigDecimal("55.20")),
                new Stock("PG", "Procter & Gamble Co.", new BigDecimal("174.60"), "Consumer Goods", 410000000000L, new BigDecimal("6.10"), new BigDecimal("28.60")),
                new Stock("KO", "Coca-Cola Company", new BigDecimal("71.50"), "Beverages", 308000000000L, new BigDecimal("2.75"), new BigDecimal("26.00")),
                new Stock("DIS", "Walt Disney Company", new BigDecimal("95.80"), "Entertainment", 175000000000L, new BigDecimal("4.80"), new BigDecimal("19.90")),

                // Major Energy & Aerospace
                new Stock("XOM", "Exxon Mobil Corporation", new BigDecimal("118.20"), "Energy & Oil", 468000000000L, new BigDecimal("8.90"), new BigDecimal("13.28")),
                new Stock("CVX", "Chevron Corporation", new BigDecimal("148.60"), "Energy & Oil", 274000000000L, new BigDecimal("11.50"), new BigDecimal("12.90")),
                new Stock("CAT", "Caterpillar Inc.", new BigDecimal("382.40"), "Industrial Machinery", 186000000000L, new BigDecimal("21.80"), new BigDecimal("17.50")),

                // Major Global Forex Pairs
                new Stock("EUR/USD", "Euro / US Dollar", new BigDecimal("1.1360"), "Foreign Exchange / Forex", 0L, BigDecimal.ZERO, BigDecimal.ZERO),
                new Stock("GBP/USD", "British Pound / US Dollar", new BigDecimal("1.3340"), "Foreign Exchange / Forex", 0L, BigDecimal.ZERO, BigDecimal.ZERO),
                new Stock("USD/JPY", "US Dollar / Japanese Yen", new BigDecimal("148.50"), "Foreign Exchange / Forex", 0L, BigDecimal.ZERO, BigDecimal.ZERO),
                new Stock("USD/CHF", "US Dollar / Swiss Franc", new BigDecimal("0.8520"), "Foreign Exchange / Forex", 0L, BigDecimal.ZERO, BigDecimal.ZERO),
                new Stock("AUD/USD", "Australian Dollar / US Dollar", new BigDecimal("0.6840"), "Foreign Exchange / Forex", 0L, BigDecimal.ZERO, BigDecimal.ZERO),
                new Stock("USD/CAD", "US Dollar / Canadian Dollar", new BigDecimal("1.3550"), "Foreign Exchange / Forex", 0L, BigDecimal.ZERO, BigDecimal.ZERO),
                new Stock("NZD/USD", "New Zealand Dollar / US Dollar", new BigDecimal("0.6280"), "Foreign Exchange / Forex", 0L, BigDecimal.ZERO, BigDecimal.ZERO),
                new Stock("EUR/GBP", "Euro / British Pound", new BigDecimal("0.8410"), "Foreign Exchange / Forex", 0L, BigDecimal.ZERO, BigDecimal.ZERO),
                new Stock("EUR/JPY", "Euro / Japanese Yen", new BigDecimal("168.70"), "Foreign Exchange / Forex", 0L, BigDecimal.ZERO, BigDecimal.ZERO),
                new Stock("GBP/JPY", "British Pound / Japanese Yen", new BigDecimal("198.10"), "Foreign Exchange / Forex", 0L, BigDecimal.ZERO, BigDecimal.ZERO),
                new Stock("USD/INR", "US Dollar / Indian Rupee", new BigDecimal("83.75"), "Foreign Exchange / Forex", 0L, BigDecimal.ZERO, BigDecimal.ZERO)
        );

        List<Stock> stocksToSave = new ArrayList<>();
        for (Stock inst : allInstruments) {
            if (stockRepository.findBySymbolIgnoreCase(inst.getSymbol()).isEmpty()) {
                stocksToSave.add(inst);
            }
        }

        if (!stocksToSave.isEmpty()) {
            stockRepository.saveAll(stocksToSave);
        }
    }
}
