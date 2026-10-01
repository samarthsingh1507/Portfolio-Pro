import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WatchlistService } from '../../../core/services/watchlist.service';
import { MarketDataService } from '../../../core/services/market-data.service';
import { WatchlistItem } from '../../../models/stock.model';
import { MarketQuote } from '../../../models/market-quote.model';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="watchlist-container">
      <div *ngIf="isLoading" class="loading-state">
        <p>Loading watchlist...</p>
      </div>

      <div *ngIf="errorMessage" class="alert alert-error">
        {{ errorMessage }}
      </div>

      <div *ngIf="!isLoading && watchlist.length === 0" class="empty-state">
        <div class="empty-icon">⭐</div>
        <h3>Your watchlist is empty</h3>
        <p>Browse the market and add stocks to track their daily price movements.</p>
      </div>

      <div *ngIf="!isLoading && watchlist.length > 0" class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Company</th>
              <th>Sector</th>
              <th class="text-right">Price</th>
              <th class="text-right">P/E Ratio</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of watchlist">
              <td>
                <a [routerLink]="['/market', item.symbol]" class="symbol-link">
                  {{ item.symbol }}
                </a>
              </td>
              <td class="company-name">{{ item.companyName }}</td>
              <td><span class="sector-badge">{{ item.sector }}</span></td>
              <td class="text-right price-cell">
                <!-- Loading State -->
                <div *ngIf="quotesLoading[item.symbol]" class="quote-table-loading">
                  <span class="micro-spinner"></span>
                </div>

                <!-- Error State -->
                <div *ngIf="quotesError[item.symbol] && !quotesLoading[item.symbol]" class="quote-table-error">
                  <span class="error-tag" title="Market data temporarily unavailable">Unavailable</span>
                  <button class="btn-retry-tiny" (click)="loadQuote(item.symbol)" title="Retry live quote">↻</button>
                </div>

                <!-- Live Quote -->
                <div *ngIf="liveQuotes[item.symbol] && !quotesLoading[item.symbol]" class="quote-table-live">
                  <div class="price-val">\${{ liveQuotes[item.symbol].price | number:'1.2-2' }}</div>
                  <div
                    class="change-tag"
                    [ngClass]="liveQuotes[item.symbol].change >= 0 ? 'text-green' : 'text-red'"
                  >
                    {{ liveQuotes[item.symbol].change >= 0 ? '+' : '' }}{{ liveQuotes[item.symbol].changePercent | number:'1.2-2' }}%
                  </div>
                </div>

                <!-- Initial State -->
                <div *ngIf="!liveQuotes[item.symbol] && !quotesLoading[item.symbol] && !quotesError[item.symbol]" class="price-col">
                  \${{ item.price | number:'1.2-2' }}
                </div>
              </td>
              <td class="text-right">{{ item.peRatio | number:'1.2-2' }}</td>
              <td class="text-center actions-col">
                <a [routerLink]="['/market', item.symbol]" class="btn btn-sm btn-outline">
                  Details
                </a>
                <button
                  class="btn btn-sm btn-remove"
                  (click)="removeFromWatchlist(item.stockId)"
                  title="Remove from watchlist"
                >
                  ✕ Remove
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .watchlist-container {
      margin-top: 1rem;
    }
    .loading-state, .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      color: #94a3b8;
    }
    .empty-icon {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
    }
    .empty-state h3 {
      color: #f8fafc;
      margin-bottom: 0.5rem;
    }
    .table-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .data-table th {
      background-color: #1e293b;
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.875rem 1.25rem;
    }
    .data-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #1e293b;
      color: #f1f5f9;
      font-size: 0.95rem;
    }
    .data-table tr:last-child td {
      border-bottom: none;
    }
    .data-table tr:hover td {
      background-color: rgba(30, 41, 59, 0.5);
    }
    .symbol-link {
      color: #38bdf8;
      font-weight: 700;
      text-decoration: none;
    }
    .symbol-link:hover {
      text-decoration: underline;
    }
    .company-name {
      color: #cbd5e1;
    }
    .sector-badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      background-color: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.25);
      color: #93c5fd;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .price-col {
      font-weight: 700;
      color: #f8fafc;
    }
    .price-cell {
      min-width: 110px;
    }
    .quote-table-loading {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 0.25rem 0;
    }
    .micro-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(56, 189, 248, 0.2);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .quote-table-error {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.35rem;
    }
    .error-tag {
      font-size: 0.72rem;
      color: #f87171;
      background: rgba(239, 68, 68, 0.1);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }
    .btn-retry-tiny {
      padding: 0.1rem 0.35rem;
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #fca5a5;
      border-radius: 3px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      line-height: 1;
      transition: all 0.15s ease;
    }
    .btn-retry-tiny:hover {
      background: #ef4444;
      color: #fff;
    }
    .quote-table-live {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.1rem;
    }
    .price-val {
      font-weight: 700;
      color: #f8fafc;
    }
    .change-tag {
      font-size: 0.75rem;
      font-weight: 600;
    }
    .text-green {
      color: #34d399;
    }
    .text-red {
      color: #f87171;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .actions-col {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
    }
    .btn {
      padding: 0.4rem 0.85rem;
      border-radius: 6px;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .btn-sm {
      padding: 0.3rem 0.65rem;
      font-size: 0.8rem;
    }
    .btn-outline {
      border: 1px solid #334155;
      color: #e2e8f0;
      background: transparent;
    }
    .btn-outline:hover {
      background-color: #1e293b;
      border-color: #38bdf8;
      color: #38bdf8;
    }
    .btn-remove {
      background-color: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }
    .btn-remove:hover {
      background-color: #ef4444;
      color: #ffffff;
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
export class WatchlistComponent implements OnInit {
  watchlist: WatchlistItem[] = [];
  isLoading = true;
  errorMessage = '';

  liveQuotes: { [symbol: string]: MarketQuote } = {};
  quotesLoading: { [symbol: string]: boolean } = {};
  quotesError: { [symbol: string]: string } = {};

  constructor(
    private watchlistService: WatchlistService,
    private marketDataService: MarketDataService
  ) {}

  ngOnInit(): void {
    this.loadWatchlist();
  }

  loadWatchlist(): void {
    this.isLoading = true;
    this.watchlistService.getWatchlist().subscribe({
      next: (items) => {
        this.watchlist = items;
        this.isLoading = false;
        this.loadQuotesForWatchlist(items);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to load watchlist';
      }
    });
  }

  loadQuotesForWatchlist(items: WatchlistItem[]): void {
    if (!items || items.length === 0) return;
    const symbols = items.map(i => i.symbol.trim().toUpperCase());

    for (const sym of symbols) {
      this.quotesLoading[sym] = true;
      this.quotesError[sym] = '';
    }

    this.marketDataService.getQuotes(symbols).subscribe({
      next: (quotes) => {
        for (const q of quotes) {
          if (q && q.symbol) {
            const sym = q.symbol.trim().toUpperCase();
            this.liveQuotes[sym] = q;
            this.quotesLoading[sym] = false;
            delete this.quotesError[sym];
          }
        }
        for (const sym of symbols) {
          this.quotesLoading[sym] = false;
        }
      },
      error: (err) => {
        for (const sym of symbols) {
          this.quotesLoading[sym] = false;
          this.quotesError[sym] = err?.message || 'Market data temporarily unavailable';
        }
      }
    });
  }

  loadQuote(symbol: string): void {
    if (!symbol) return;
    this.quotesLoading[symbol] = true;
    this.quotesError[symbol] = '';

    this.marketDataService.getQuote(symbol).subscribe({
      next: (quote) => {
        this.liveQuotes[symbol] = quote;
        this.quotesLoading[symbol] = false;
      },
      error: (err) => {
        this.quotesLoading[symbol] = false;
        this.quotesError[symbol] = err?.message || 'Market data temporarily unavailable';
      }
    });
  }

  removeFromWatchlist(stockId: number): void {
    this.watchlistService.removeFromWatchlist(stockId).subscribe({
      next: () => {
        this.watchlist = this.watchlist.filter(item => item.stockId !== stockId);
      },
      error: (err) => {
        alert(err?.error?.message || 'Failed to remove stock from watchlist');
      }
    });
  }
}
