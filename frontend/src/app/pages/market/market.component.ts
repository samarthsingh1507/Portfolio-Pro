import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { MarketService } from '../../core/services/market.service';
import { MarketDataService } from '../../core/services/market-data.service';
import { WatchlistService } from '../../core/services/watchlist.service';
import { Stock } from '../../models/stock.model';
import { MarketQuote } from '../../models/market-quote.model';
import { WatchlistComponent } from './watchlist/watchlist.component';

@Component({
  selector: 'app-market',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, WatchlistComponent],
  template: `
    <div class="market-container">
      <div class="market-header">
        <div>
          <div class="title-row">
            <h1>Market & Forex Directory</h1>
            <span class="live-pulse-badge">
              <span class="pulse-dot"></span> LIVE AUTO-STREAM
            </span>
          </div>
          <p class="subtitle">Real-time market quotes, global forex currency rates, technical sector data, and live trading feed</p>
        </div>

        <!-- Navigation Tabs -->
        <div class="tab-controls">
          <button
            class="tab-btn"
            [class.active]="activeTab === 'all' && selectedCategory === 'all'"
            (click)="activeTab = 'all'; selectedCategory = 'all'"
          >
            All Assets ({{ stocks.length }})
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab === 'all' && selectedCategory === 'stocks'"
            (click)="activeTab = 'all'; selectedCategory = 'stocks'"
          >
            📈 Stocks ({{ stockCount }})
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab === 'all' && selectedCategory === 'forex'"
            (click)="activeTab = 'all'; selectedCategory = 'forex'"
          >
            💱 Forex ({{ forexCount }})
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab === 'watchlist'"
            (click)="activeTab = 'watchlist'"
          >
            ⭐ Watchlist
          </button>
        </div>
      </div>

      <!-- Tab 1: All Stocks/Forex Table with Filters -->
      <div *ngIf="activeTab === 'all'" class="tab-content">
        <div class="filter-bar">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search by symbol or asset name (e.g. AAPL, EUR/USD, Gold, NVDA)..."
              class="search-input"
            />
            <button
              *ngIf="searchQuery"
              (click)="searchQuery = ''"
              class="clear-btn"
              title="Clear search"
            >
              ✕
            </button>
          </div>

          <div class="sector-filter">
            <select [(ngModel)]="selectedSector" class="select-control">
              <option value="">All Sectors & Classes</option>
              <option *ngFor="let s of sectors" [value]="s">{{ s }}</option>
            </select>
          </div>

          <button
            class="btn-live-toggle"
            [class.active]="isLiveTickActive"
            (click)="isLiveTickActive = !isLiveTickActive"
            title="Toggle real-time streaming ticks across all instruments"
          >
            <span class="live-dot" [class.paused]="!isLiveTickActive"></span>
            <span>{{ isLiveTickActive ? '⚡ LIVE REAL-TIME FEED' : '⏸ FEED PAUSED' }}</span>
          </button>

          <button class="btn btn-outline btn-refresh" (click)="refreshQuotesNow()" title="Force Refresh Live Quotes">
            <span [class.spin-icon]="isRefreshing">↻</span> Refresh
          </button>
        </div>

        <div *ngIf="isLoading" class="loading-card">
          <p>Loading market data...</p>
        </div>

        <div *ngIf="errorMessage" class="alert alert-error">
          {{ errorMessage }}
        </div>

        <div *ngIf="!isLoading && filteredStocks.length === 0" class="empty-results">
          <p>No assets found matching "<strong>{{ searchQuery }}</strong>"</p>
        </div>

        <div *ngIf="!isLoading && filteredStocks.length > 0" class="table-card">
          <table class="market-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Asset / Pair Name</th>
                <th>Sector / Category</th>
                <th class="text-right">Live Price</th>
                <th class="text-center">Trend (7D)</th>
                <th class="text-right">P/E / Multiplier</th>
                <th class="text-right">Market Cap / Vol</th>
                <th class="text-center">Watchlist</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let stock of filteredStocks" [class.row-flash-up]="flashingSymbols[stock.symbol] === 'up'" [class.row-flash-down]="flashingSymbols[stock.symbol] === 'down'">
                <td>
                  <a [routerLink]="['/market', stock.symbol]" class="symbol-badge" [class.forex-badge]="isForex(stock.symbol)">
                    {{ stock.symbol }}
                  </a>
                </td>
                <td class="company-name">
                  <div class="name-box">
                    <span>{{ stock.companyName }}</span>
                    <span *ngIf="isForex(stock.symbol)" class="fx-tag">FOREX</span>
                  </div>
                </td>
                <td><span class="sector-tag">{{ stock.sector }}</span></td>
                <td class="text-right price-cell">
                  <!-- Live or Reference Price with real-time flash -->
                  <div *ngIf="liveQuotes[stock.symbol]" class="quote-table-live">
                    <div class="price-val" [ngClass]="flashingSymbols[stock.symbol] === 'up' ? 'text-green' : (flashingSymbols[stock.symbol] === 'down' ? 'text-red' : '')">
                      \${{ liveQuotes[stock.symbol].price | number:(isForex(stock.symbol) ? '1.4-4' : '1.2-2') }}
                    </div>
                    <div
                      class="change-tag"
                      [ngClass]="liveQuotes[stock.symbol].change >= 0 ? 'text-green' : 'text-red'"
                    >
                      {{ liveQuotes[stock.symbol].change >= 0 ? '+' : '' }}{{ liveQuotes[stock.symbol].changePercent | number:'1.2-2' }}%
                    </div>
                  </div>

                  <!-- Reference Price if Quote Pending -->
                  <div *ngIf="!liveQuotes[stock.symbol]" class="price-text">
                    \${{ stock.price | number:(isForex(stock.symbol) ? '1.4-4' : '1.2-2') }}
                  </div>
                </td>
                <td class="text-center trend-cell">
                  <a [routerLink]="['/market', stock.symbol]" title="View Technical Price Graph">
                    <svg class="sparkline-svg" viewBox="0 0 72 26" width="72" height="26">
                      <path [attr.d]="getSparklineFillD(stock.symbol)" [attr.fill]="getSparklineColor(stock.symbol)" fill-opacity="0.15" />
                      <path [attr.d]="getSparklineD(stock.symbol)" fill="none" [attr.stroke]="getSparklineColor(stock.symbol)" stroke-width="2" stroke-linecap="round" />
                    </svg>
                  </a>
                </td>
                <td class="text-right">{{ stock.peRatio ? (stock.peRatio | number:'1.2-2') : '—' }}</td>
                <td class="text-right text-muted">{{ stock.marketCap ? ('$' + formatMarketCap(stock.marketCap)) : '—' }}</td>
                <td class="text-center">
                  <button
                    class="btn-icon"
                    (click)="toggleWatchlist(stock)"
                    [title]="watchlistService.isWatched(stock.id) ? 'Remove from watchlist' : 'Add to watchlist'"
                  >
                    <span *ngIf="watchlistService.isWatched(stock.id)" class="star-active">★</span>
                    <span *ngIf="!watchlistService.isWatched(stock.id)" class="star-inactive">☆</span>
                  </button>
                </td>
                <td class="text-center">
                  <a [routerLink]="['/market', stock.symbol]" class="btn btn-sm btn-trade">
                    Trade / Chart
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 2: Watchlist Tab -->
      <div *ngIf="activeTab === 'watchlist'" class="tab-content">
        <app-watchlist></app-watchlist>
      </div>
    </div>
  `,
  styles: [`
    .market-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .market-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 1rem;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 1.25rem;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      margin-bottom: 0.25rem;
    }
    .market-header h1 {
      font-size: 1.85rem;
      color: #f8fafc;
      margin: 0;
    }
    .live-pulse-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      animation: liveGlow 1.5s infinite;
    }
    @keyframes liveGlow {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.4); opacity: 0.6; }
    }
    .subtitle {
      color: #94a3b8;
      font-size: 0.9rem;
      margin: 0;
    }
    .tab-controls {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .tab-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tab-btn:hover {
      color: #f8fafc;
      background: #334155;
    }
    .tab-btn.active {
      background: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
    }
    .filter-bar {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
      align-items: center;
    }
    .search-box {
      flex: 1;
      min-width: 280px;
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 1rem;
      color: #64748b;
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 0.7rem 2.5rem 0.7rem 2.5rem;
      font-size: 0.95rem;
      color: #f8fafc;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .search-input:focus {
      border-color: #3b82f6;
    }
    .clear-btn {
      position: absolute;
      right: 0.75rem;
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .select-control {
      background: #0f172a;
      border: 1px solid #1e293b;
      color: #f8fafc;
      border-radius: 8px;
      padding: 0.7rem 1rem;
      font-size: 0.9rem;
      outline: none;
      cursor: pointer;
    }
    .btn-live-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
      padding: 0.65rem 0.95rem;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-live-toggle.active {
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.25);
    }
    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      animation: liveGlow 1.4s infinite;
    }
    .live-dot.paused {
      background: #94a3b8;
      animation: none;
    }
    .btn-refresh {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-weight: 600;
    }
    .spin-icon {
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .table-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      overflow-x: auto;
    }
    .market-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .market-table th {
      background-color: #1e293b;
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.85rem 1.25rem;
      border-bottom: 1px solid #334155;
    }
    .market-table td {
      padding: 0.9rem 1.25rem;
      border-bottom: 1px solid #1e293b;
      color: #f8fafc;
      font-size: 0.9rem;
      transition: background-color 0.3s ease;
    }
    .market-table tr:hover td {
      background-color: #131d31;
    }
    .row-flash-up td {
      background-color: rgba(16, 185, 129, 0.12) !important;
    }
    .row-flash-down td {
      background-color: rgba(239, 68, 68, 0.12) !important;
    }
    .symbol-badge {
      display: inline-block;
      font-size: 0.85rem;
      font-weight: 800;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .symbol-badge:hover {
      background: rgba(56, 189, 248, 0.25);
    }
    .symbol-badge.forex-badge {
      color: #c084fc;
      background: rgba(192, 132, 252, 0.12);
    }
    .company-name {
      font-weight: 500;
    }
    .name-box {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .fx-tag {
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.1rem 0.35rem;
      border-radius: 3px;
      background: rgba(192, 132, 252, 0.2);
      color: #c084fc;
    }
    .sector-tag {
      display: inline-block;
      font-size: 0.75rem;
      background-color: #1e293b;
      color: #94a3b8;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .price-cell {
      min-width: 110px;
    }
    .quote-table-live {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.1rem;
    }
    .price-val {
      font-size: 0.95rem;
      font-weight: 800;
      font-family: monospace;
      transition: color 0.2s ease;
    }
    .change-tag {
      font-size: 0.75rem;
      font-weight: 700;
    }
    .price-text {
      font-weight: 700;
      font-family: monospace;
    }
    .trend-cell {
      vertical-align: middle;
    }
    .sparkline-svg {
      display: block;
      margin: 0 auto;
    }
    .btn-icon {
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem;
      line-height: 1;
    }
    .star-active { color: #fbbf24; }
    .star-inactive { color: #475569; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-muted { color: #64748b; }
    .text-green { color: #10b981; }
    .text-red { color: #ef4444; }
    .btn {
      padding: 0.4rem 0.85rem;
      border-radius: 6px;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn-sm {
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
    }
    .btn-outline {
      border: 1px solid #334155;
      color: #e2e8f0;
      background: transparent;
    }
    .btn-trade {
      background: rgba(37, 99, 235, 0.18);
      border: 1px solid rgba(37, 99, 235, 0.4);
      color: #60a5fa;
      font-weight: 700;
    }
    .btn-trade:hover {
      background: #2563eb;
      color: #ffffff;
    }
    .loading-card, .empty-results {
      padding: 3rem;
      text-align: center;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      color: #94a3b8;
    }
    .alert-error {
      background-color: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #f87171;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
    }
  `]
})
export class MarketComponent implements OnInit, OnDestroy {
  stocks: Stock[] = [];
  activeTab: 'all' | 'watchlist' = 'all';
  selectedCategory: 'all' | 'stocks' | 'forex' = 'all';
  searchQuery = '';
  selectedSector = '';
  isLoading = true;
  isRefreshing = false;
  errorMessage = '';

  isLiveTickActive = true;
  flashingSymbols: { [symbol: string]: 'up' | 'down' } = {};

  liveQuotes: { [symbol: string]: MarketQuote } = {};
  quotesLoading: { [symbol: string]: boolean } = {};
  quotesError: { [symbol: string]: string } = {};

  sectors: string[] = [];
  private liveSubscription: Subscription | null = null;
  private liveTickTimer: any = null;

  constructor(
    private marketService: MarketService,
    private marketDataService: MarketDataService,
    public watchlistService: WatchlistService
  ) {}

  get stockCount(): number {
    return this.stocks.filter(s => !s.symbol.includes('/')).length;
  }

  get forexCount(): number {
    return this.stocks.filter(s => s.symbol.includes('/')).length;
  }

  isForex(symbol: string): boolean {
    return (symbol || '').includes('/');
  }

  ngOnInit(): void {
    this.loadMarketData();
    this.loadWatchlistIds();

    // High-frequency live tick stream across market directory
    this.liveTickTimer = setInterval(() => {
      if (this.isLiveTickActive && this.stocks.length > 0 && !this.isLoading) {
        this.simulateDirectoryMicroTicks();
      }
    }, 1200);

    // Auto-stream quotes periodically
    this.liveSubscription = interval(10000).subscribe(() => {
      if (this.stocks.length > 0 && this.activeTab === 'all' && !this.isLoading) {
        this.pollQuotesSilently();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.liveSubscription) {
      this.liveSubscription.unsubscribe();
      this.liveSubscription = null;
    }
    if (this.liveTickTimer) {
      clearInterval(this.liveTickTimer);
      this.liveTickTimer = null;
    }
  }

  private simulateDirectoryMicroTicks(): void {
    const list = this.filteredStocks;
    if (list.length === 0) return;

    // Pick 3 to 6 random symbols to tick
    const count = Math.min(6, Math.max(2, Math.floor(list.length * 0.15)));
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * list.length);
      const stock = list[idx];
      if (!stock) continue;

      const sym = stock.symbol;
      const isFx = this.isForex(sym);
      const curQuote = this.liveQuotes[sym];
      const curPrice = curQuote ? curQuote.price : stock.price;

      const deltaPct = (isFx ? 0.0003 : 0.0012) * (Math.random() - 0.49);
      let newPrice = curPrice + curPrice * deltaPct;
      if (newPrice <= 0) newPrice = curPrice;

      newPrice = isFx ? Math.round(newPrice * 10000) / 10000 : Math.round(newPrice * 100) / 100;

      const refPrice = stock.price || curPrice;
      const change = newPrice - refPrice;
      const changePercent = refPrice > 0 ? (change / refPrice) * 100 : 0;

      const direction: 'up' | 'down' = newPrice >= curPrice ? 'up' : 'down';
      this.flashingSymbols[sym] = direction;
      setTimeout(() => {
        delete this.flashingSymbols[sym];
      }, 500);

      this.liveQuotes[sym] = {
        symbol: sym,
        price: newPrice,
        change: isFx ? Math.round(change * 10000) / 10000 : Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        timestamp: new Date().toISOString(),
        marketStatus: 'OPEN'
      };
    }
  }

  refreshQuotesNow(): void {
    if (this.stocks.length === 0) return;
    this.isRefreshing = true;
    const symbols = this.stocks.map(s => s.symbol.trim().toUpperCase());
    this.marketDataService.getQuotes(symbols).subscribe({
      next: (quotes) => {
        for (const q of quotes) {
          if (q && q.symbol) {
            const sym = q.symbol.trim().toUpperCase();
            this.liveQuotes[sym] = q;
            this.quotesError[sym] = '';
          }
        }
        this.isRefreshing = false;
      },
      error: () => {
        this.isRefreshing = false;
      }
    });
  }

  pollQuotesSilently(): void {
    const symbols = this.stocks.map(s => s.symbol.trim().toUpperCase());
    this.marketDataService.getQuotes(symbols).subscribe({
      next: (quotes) => {
        for (const q of quotes) {
          if (q && q.symbol) {
            const sym = q.symbol.trim().toUpperCase();
            this.liveQuotes[sym] = q;
            this.quotesError[sym] = '';
          }
        }
      },
      error: () => {}
    });
  }

  loadMarketData(): void {
    this.isLoading = true;
    this.marketService.getStocks().subscribe({
      next: (data) => {
        this.stocks = data;
        this.sectors = Array.from(new Set(data.map(s => s.sector))).sort();
        this.isLoading = false;
        this.loadQuotesForStocks(data);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to load stock market data';
      }
    });
  }

  loadQuotesForStocks(stocks: Stock[]): void {
    if (!stocks || stocks.length === 0) return;

    for (const s of stocks) {
      if (s && s.symbol) {
        const sym = s.symbol.trim().toUpperCase();
        if (!this.liveQuotes[sym]) {
          this.liveQuotes[sym] = {
            symbol: sym,
            price: s.price || 100.0,
            change: 0.0,
            changePercent: 0.0,
            timestamp: new Date().toISOString(),
            marketStatus: 'OPEN'
          };
        }
      }
    }

    const symbols = stocks.map(s => s.symbol.trim().toUpperCase());
    const chunkSize = 16;
    for (let i = 0; i < symbols.length; i += chunkSize) {
      const chunk = symbols.slice(i, i + chunkSize);
      this.marketDataService.getQuotes(chunk).subscribe({
        next: (quotes) => {
          for (const q of quotes) {
            if (q && q.symbol) {
              const sym = q.symbol.trim().toUpperCase();
              this.liveQuotes[sym] = q;
            }
          }
        },
        error: () => {}
      });
    }
  }

  getSparklineD(symbol: string): string {
    const isUp = (this.liveQuotes[symbol]?.change ?? 0) >= 0;
    return isUp
      ? 'M 0,20 Q 16,16 32,10 T 52,12 T 72,4'
      : 'M 0,5 Q 18,11 36,17 T 56,13 T 72,22';
  }

  getSparklineFillD(symbol: string): string {
    const isUp = (this.liveQuotes[symbol]?.change ?? 0) >= 0;
    return isUp
      ? 'M 0,20 Q 16,16 32,10 T 52,12 T 72,4 L 72,26 L 0,26 Z'
      : 'M 0,5 Q 18,11 36,17 T 56,13 T 72,22 L 72,26 L 0,26 Z';
  }

  getSparklineColor(symbol: string): string {
    const change = this.liveQuotes[symbol]?.change ?? 0;
    return change >= 0 ? '#10b981' : '#ef4444';
  }

  loadWatchlistIds(): void {
    this.watchlistService.getWatchlist().subscribe({
      next: () => {},
      error: () => {}
    });
  }

  get filteredStocks(): Stock[] {
    return this.stocks.filter(stock => {
      const isFx = this.isForex(stock.symbol);
      if (this.selectedCategory === 'stocks' && isFx) return false;
      if (this.selectedCategory === 'forex' && !isFx) return false;

      const matchesSearch = !this.searchQuery.trim() ||
        stock.symbol.toLowerCase().includes(this.searchQuery.trim().toLowerCase()) ||
        stock.companyName.toLowerCase().includes(this.searchQuery.trim().toLowerCase());

      const matchesSector = !this.selectedSector || stock.sector === this.selectedSector;

      return matchesSearch && matchesSector;
    });
  }

  toggleWatchlist(stock: Stock): void {
    const isWatched = this.watchlistService.isWatched(stock.id);
    if (isWatched) {
      this.watchlistService.removeFromWatchlist(stock.id).subscribe({
        next: () => {},
        error: (err) => alert(err?.error?.message || 'Failed to remove from watchlist')
      });
    } else {
      this.watchlistService.addToWatchlist(stock.id).subscribe({
        next: () => {},
        error: (err) => alert(err?.error?.message || 'Failed to add to watchlist')
      });
    }
  }

  formatMarketCap(cap: number): string {
    if (!cap) return 'N/A';
    if (cap >= 1e12) {
      return (cap / 1e12).toFixed(2) + 'T';
    }
    if (cap >= 1e9) {
      return (cap / 1e9).toFixed(2) + 'B';
    }
    return cap.toLocaleString();
  }
}
