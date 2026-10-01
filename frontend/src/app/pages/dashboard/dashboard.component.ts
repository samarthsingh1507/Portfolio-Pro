import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { PortfolioService } from '../../core/services/portfolio.service';
import { MarketService } from '../../core/services/market.service';
import { MarketDataService } from '../../core/services/market-data.service';
import { WatchlistService } from '../../core/services/watchlist.service';
import { TradeService } from '../../core/services/trade.service';
import { Portfolio, Holding } from '../../models/portfolio.model';
import { Stock, WatchlistItem } from '../../models/stock.model';
import { OrderResponse } from '../../models/order.model';
import { MarketQuote } from '../../models/market-quote.model';
import { TradeFormComponent } from '../trading/trade-form/trade-form.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TradeFormComponent],
  template: `
    <div class="dashboard-container">
      <!-- HEADER -->
      <div class="dashboard-header">
        <div class="welcome-box">
          <h1>{{ getGreeting() }}, <span class="username-highlight">{{ authService.currentUser() || 'Trader' }}</span> {{ getGreetingIcon() }}</h1>
          <p class="subtitle">Here is your live simulated market overview, portfolio valuation, and recent activity.</p>
        </div>

        <!-- QUICK ACTIONS -->
        <div class="quick-actions">
          <a routerLink="/market" class="btn btn-outline">
            🔍 View Market
          </a>
          <a routerLink="/portfolio" class="btn btn-outline">
            💼 View Portfolio
          </a>
          <button class="btn btn-primary" (click)="openQuickBuy()">
            ⚡ Buy Stock
          </button>
        </div>
      </div>

      <!-- Global Loading State -->
      <div *ngIf="isLoading" class="state-card">
        <div class="spinner"></div>
        <p>Loading your dashboard analytics & market data...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage && !isLoading" class="alert alert-error">
        <span>{{ errorMessage }}</span>
        <button class="btn btn-sm btn-retry" (click)="loadAllDashboardData()">Retry</button>
      </div>

      <!-- Order Execution Notification -->
      <div *ngIf="orderNotification" class="alert alert-success">
        {{ orderNotification }}
      </div>

      <div *ngIf="!isLoading" class="dashboard-body">
        <!-- SUMMARY STAT CARDS -->
        <div class="summary-cards">
          <!-- Portfolio Value -->
          <div class="stat-card">
            <span class="stat-label">Portfolio Value</span>
            <div class="stat-value">
              \${{ (portfolio?.currentValue ?? 0) | number:'1.2-2' }}
            </div>
            <span class="stat-hint">Live mark-to-market</span>
          </div>

          <!-- Total Invested -->
          <div class="stat-card">
            <span class="stat-label">Invested Capital</span>
            <div class="stat-value">
              \${{ (portfolio?.totalInvested || 0) | number:'1.2-2' }}
            </div>
            <span class="stat-hint">Aggregate cost basis</span>
          </div>

          <!-- Total P/L -->
          <div class="stat-card">
            <span class="stat-label">Total Profit / Loss</span>
            <div
              class="stat-value"
              [ngClass]="(portfolio?.totalProfitLoss ?? 0) >= 0 ? 'text-green' : 'text-red'"
            >
              {{ (portfolio?.totalProfitLoss ?? 0) >= 0 ? '+' : '' }}\${{ (portfolio?.totalProfitLoss ?? 0) | number:'1.2-2' }}
            </div>
            <span class="stat-hint">Net dollar gain/loss</span>
          </div>

          <!-- P/L % -->
          <div class="stat-card">
            <span class="stat-label">Profit / Loss %</span>
            <div class="stat-pill-wrapper">
              <span
                class="stat-pill"
                [ngClass]="(portfolio?.profitLossPercent ?? 0) >= 0 ? 'pill-green' : 'pill-red'"
              >
                {{ (portfolio?.profitLossPercent ?? 0) >= 0 ? '▲ +' : '▼ ' }}{{ (portfolio?.profitLossPercent ?? 0) | number:'1.2-2' }}%
              </span>
            </div>
            <span class="stat-hint">Portfolio return rate</span>
          </div>
        </div>

        <!-- 2-COLUMN MAIN CONTENT GRID -->
        <div class="dashboard-grid">
          <!-- LEFT COLUMN: PORTFOLIO & RECENT ORDERS -->
          <div class="grid-column">
            <!-- PORTFOLIO: Top Holdings -->
            <div class="dashboard-card">
              <div class="card-header">
                <div>
                  <h3>Top Holdings</h3>
                  <p class="card-sub">Your largest current simulated positions</p>
                </div>
                <a routerLink="/portfolio" class="card-action-link">Full Portfolio →</a>
              </div>

              <!-- Empty State -->
              <div *ngIf="!portfolio || portfolio.holdings.length === 0" class="empty-box">
                <span class="empty-icon">💼</span>
                <p>No holdings yet. Start simulated trading to build your portfolio.</p>
                <a routerLink="/market" class="btn btn-sm btn-outline">Explore Market</a>
              </div>

              <!-- Top Holdings Table -->
              <div *ngIf="portfolio && portfolio.holdings.length > 0" class="table-wrapper scrollable-card-body">
                <table class="dash-table">
                  <thead>
                    <tr>
                      <th>Stock</th>
                      <th class="text-right">Qty</th>
                      <th class="text-right">Current Price</th>
                      <th class="text-right">Value</th>
                      <th class="text-right">P / L</th>
                      <th class="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let h of topHoldings" [class.hold-flash-up]="flashingSymbols[h.symbol] === 'up'" [class.hold-flash-down]="flashingSymbols[h.symbol] === 'down'">
                      <td>
                        <div class="stock-cell">
                          <a [routerLink]="['/market', h.symbol]" class="stock-sym">{{ h.symbol }}</a>
                          <span class="stock-co">{{ h.companyName }}</span>
                        </div>
                      </td>
                      <td class="text-right font-bold">{{ h.quantity }}</td>
                      <td class="text-right font-mono" [ngClass]="flashingSymbols[h.symbol] === 'up' ? 'text-green font-bold' : (flashingSymbols[h.symbol] === 'down' ? 'text-red font-bold' : '')">
                        \${{ (h.currentPrice ?? 0) | number: getPriceFormat(h.symbol) }}
                      </td>
                      <td class="text-right font-bold font-mono">\${{ (h.currentValue ?? 0) | number:'1.2-2' }}</td>
                      <td
                        class="text-right font-bold font-mono"
                        [ngClass]="(h.profitLoss ?? 0) >= 0 ? 'text-green' : 'text-red'"
                      >
                        {{ (h.profitLoss ?? 0) >= 0 ? '+' : '' }}\${{ (h.profitLoss ?? 0) | number:'1.2-2' }}
                      </td>
                      <td class="text-center">
                        <button class="btn-micro btn-micro-trade" (click)="openTradeForHolding(h, 'BUY')">
                          Trade
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- RECENT ORDERS -->
            <div class="dashboard-card">
              <div class="card-header">
                <div>
                  <h3>Recent Orders</h3>
                  <p class="card-sub">Latest executed simulated transactions</p>
                </div>
                <a routerLink="/orders" class="card-action-link">All Orders →</a>
              </div>

              <!-- Empty State -->
              <div *ngIf="recentOrders.length === 0" class="empty-box scrollable-card-body">
                <span class="empty-icon">📋</span>
                <p>No recent orders executed yet.</p>
                <a routerLink="/market" class="btn btn-sm btn-outline">Place First Trade</a>
              </div>

              <!-- Orders Table -->
              <div *ngIf="recentOrders.length > 0" class="table-wrapper scrollable-card-body">
                <table class="dash-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Symbol</th>
                      <th class="text-center">Type</th>
                      <th class="text-right">Qty</th>
                      <th class="text-right">Price</th>
                      <th class="text-right">Total</th>
                      <th class="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let ord of recentOrders">
                      <td class="text-muted">{{ ord.createdAt | date:'shortDate' }}</td>
                      <td>
                        <a [routerLink]="['/market', ord.symbol]" class="stock-sym">{{ ord.symbol }}</a>
                      </td>
                      <td class="text-center">
                        <span class="badge" [ngClass]="ord.type === 'BUY' ? 'badge-buy' : 'badge-sell'">
                          {{ ord.type }}
                        </span>
                      </td>
                      <td class="text-right font-bold">{{ ord.quantity }}</td>
                      <td class="text-right">\${{ ord.price | number:'1.2-2' }}</td>
                      <td class="text-right font-bold">\${{ ord.totalValue | number:'1.2-2' }}</td>
                      <td class="text-center">
                        <span class="badge badge-executed">{{ ord.status }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: MARKET & WATCHLIST -->
          <div class="grid-column">
            <!-- MARKET: Popular Stocks -->
            <div class="dashboard-card">
              <div class="card-header">
                <div>
                  <div class="card-title-row">
                    <h3>Market Leaders</h3>
                    <span class="live-pill"><span class="pulse-dot"></span> LIVE</span>
                  </div>
                  <p class="card-sub">{{ popularStocks.length }} real-time tracked market instruments</p>
                </div>
                <div class="card-header-actions">
                  <button class="btn-micro btn-micro-expand" (click)="openMarketLeadersModal()" title="Open expanded Market Leaders window">
                    ⛶ Expand Window
                  </button>
                  <button class="btn-micro btn-micro-refresh" (click)="refreshMarketLeadersNow()" [disabled]="isRefreshingMarket" title="Refresh live quotes">
                    <svg class="refresh-micro-svg" [class.spin-icon]="isRefreshingMarket" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    <span>{{ isRefreshingMarket ? 'Refreshing...' : 'Refresh' }}</span>
                  </button>
                  <a routerLink="/market" class="card-action-link">Market Directory →</a>
                </div>
              </div>

              <div *ngIf="popularStocks.length === 0" class="empty-box scrollable-card-body">
                <p>No market stocks available.</p>
              </div>

              <div *ngIf="popularStocks.length > 0" class="popular-stocks-list scrollable-card-body">
                <div *ngFor="let s of popularStocks" class="popular-stock-row" [class.pop-flash-up]="flashingSymbols[s.symbol] === 'up'" [class.pop-flash-down]="flashingSymbols[s.symbol] === 'down'">
                  <div class="pop-left">
                    <a [routerLink]="['/market', s.symbol]" class="stock-sym-lg">{{ s.symbol }}</a>
                    <div class="pop-details">
                      <span class="pop-name">{{ s.companyName }}</span>
                      <span class="pop-sector">{{ s.sector }}</span>
                    </div>
                  </div>

                  <!-- Mini Trend Graph -->
                  <div class="pop-graph" *ngIf="liveQuotes[s.symbol]" [title]="'View ' + s.symbol + ' technical chart'">
                    <a [routerLink]="['/market', s.symbol]">
                      <svg class="mini-sparkline" viewBox="0 0 64 22" width="64" height="22">
                        <path [attr.d]="getSparklineFillD(s.symbol)" [attr.fill]="getSparklineColor(s.symbol)" fill-opacity="0.15" />
                        <path [attr.d]="getSparklineD(s.symbol)" fill="none" [attr.stroke]="getSparklineColor(s.symbol)" stroke-width="1.8" stroke-linecap="round" />
                      </svg>
                    </a>
                  </div>

                  <div class="pop-right">
                    <!-- Loading / Updating indicator -->
                    <div *ngIf="quotesLoading[s.symbol] && !liveQuotes[s.symbol]" class="quote-status-loading">
                      <span class="micro-spinner"></span>
                      <span class="loading-label">Fetching...</span>
                    </div>

                    <!-- Price Block: Always shows real/live price with status badge -->
                    <div *ngIf="liveQuotes[s.symbol]" class="pop-quote-block">
                      <div class="pop-price-row">
                        <span class="pop-price" [ngClass]="flashingSymbols[s.symbol] === 'up' ? 'text-green font-bold' : (flashingSymbols[s.symbol] === 'down' ? 'text-red font-bold' : '')">
                          \${{ liveQuotes[s.symbol].price | number: getPriceFormat(s.symbol) }}
                        </span>
                        <span
                          class="market-badge-micro"
                          [ngClass]="liveQuotes[s.symbol].marketStatus === 'OPEN' ? 'status-open' : 'status-closed'"
                          [title]="'Market: ' + liveQuotes[s.symbol].marketStatus"
                        >
                          <span class="dot-indicator"></span> {{ liveQuotes[s.symbol].marketStatus }}
                        </span>
                      </div>
                      <div class="pop-change-row">
                        <span
                          class="pop-change"
                          [ngClass]="liveQuotes[s.symbol].change >= 0 ? 'text-green' : 'text-red'"
                        >
                          {{ liveQuotes[s.symbol].change >= 0 ? '▲ +' : '▼ ' }}\${{ (liveQuotes[s.symbol].change >= 0 ? liveQuotes[s.symbol].change : -liveQuotes[s.symbol].change) | number: getPriceFormat(s.symbol) }}
                          ({{ liveQuotes[s.symbol].changePercent | number:'1.2-2' }}%)
                        </span>
                        <span *ngIf="liveQuotes[s.symbol].timestamp" class="pop-timestamp" [title]="'As of ' + (liveQuotes[s.symbol].timestamp | date:'medium')">
                          {{ liveQuotes[s.symbol].timestamp | date:'HH:mm:ss' }}
                        </span>
                      </div>
                    </div>

                    <!-- Fallback if neither loaded -->
                    <div *ngIf="!liveQuotes[s.symbol] && !quotesLoading[s.symbol]" class="pop-quote-block">
                      <div class="pop-price-row">
                        <span class="pop-price">\${{ s.price | number: getPriceFormat(s.symbol) }}</span>
                      </div>
                    </div>

                    <div class="pop-actions">
                      <button
                        class="btn-micro"
                        [ngClass]="isInWatchlist(s.id) ? 'btn-micro-active' : 'btn-micro-star'"
                        (click)="toggleWatchlist(s)"
                        [title]="isInWatchlist(s.id) ? 'Remove from Watchlist' : 'Add to Watchlist'"
                      >
                        {{ isInWatchlist(s.id) ? '★' : '☆' }}
                      </button>
                      <button class="btn-micro btn-micro-buy" (click)="openTradeForStock(s, 'BUY')">
                        Buy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- WATCHLIST: Current User's Watchlist -->
            <div class="dashboard-card">
              <div class="card-header">
                <div>
                  <h3>My Watchlist</h3>
                  <p class="card-sub">Securities you are monitoring</p>
                </div>
                <span class="badge badge-watchlist-count">{{ watchlist.length }} Saved</span>
              </div>

              <!-- Empty State -->
              <div *ngIf="watchlist.length === 0" class="empty-box scrollable-card-body">
                <span class="empty-icon">⭐</span>
                <p>Your watchlist is empty. Add stocks from the market to monitor them here.</p>
                <a routerLink="/market" class="btn btn-sm btn-outline">Browse Stocks</a>
              </div>

              <div *ngIf="watchlist.length > 0" class="watchlist-items-list scrollable-card-body">
                <div *ngFor="let w of watchlist" class="watchlist-row">
                  <div class="watch-left">
                    <a [routerLink]="['/market', w.symbol]" class="stock-sym">{{ w.symbol }}</a>
                    <span class="watch-company">{{ w.companyName }}</span>
                  </div>

                  <div class="watch-right">
                    <span class="watch-price font-bold">\${{ w.price | number:'1.2-2' }}</span>
                    <button class="btn-micro btn-micro-buy" (click)="openTradeFromWatchlist(w, 'BUY')">
                      Buy
                    </button>
                    <button class="btn-micro btn-micro-remove" (click)="removeFromWatchlist(w.stockId)" title="Remove">
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MARKET LEADERS EXPANDED WINDOW MODAL -->
      <div *ngIf="showMarketLeadersModal" class="modal-backdrop" (click)="closeMarketLeadersModal()">
        <div class="modal-dialog modal-xl" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <div class="modal-badge-title">
                <h2>🚀 Market Leaders Live Explorer</h2>
                <span class="live-pill"><span class="pulse-dot"></span> {{ filteredModalStocks.length }} ASSETS LIVE</span>
              </div>
              <p class="modal-subtitle">Real-time quotes, technical charts, sparklines, and direct instant execution.</p>
            </div>
            <button class="modal-close-btn" (click)="closeMarketLeadersModal()" title="Close Window">✕</button>
          </div>

          <!-- Filter & Search Toolbar -->
          <div class="modal-toolbar">
            <div class="search-input-wrapper">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                class="search-input"
                placeholder="Search symbol (e.g. AAPL, NVDA, EUR/USD) or company name..."
                [(ngModel)]="modalSearchTerm"
              />
              <button *ngIf="modalSearchTerm" class="clear-search-btn" (click)="modalSearchTerm = ''">✕</button>
            </div>

            <div class="sector-tabs">
              <button
                class="tab-pill"
                [ngClass]="{ 'tab-active': modalSectorFilter === 'ALL' }"
                (click)="modalSectorFilter = 'ALL'"
              >
                All ({{ popularStocks.length }})
              </button>
              <button
                class="tab-pill"
                [ngClass]="{ 'tab-active': modalSectorFilter === 'Technology' }"
                (click)="modalSectorFilter = 'Technology'"
              >
                Technology
              </button>
              <button
                class="tab-pill"
                [ngClass]="{ 'tab-active': modalSectorFilter === 'Automotive' }"
                (click)="modalSectorFilter = 'Automotive'"
              >
                Automotive
              </button>
              <button
                class="tab-pill"
                [ngClass]="{ 'tab-active': modalSectorFilter === 'Forex' }"
                (click)="modalSectorFilter = 'Forex'"
              >
                Forex & FX
              </button>
              <button
                class="tab-pill"
                [ngClass]="{ 'tab-active': modalSectorFilter === 'Finance' }"
                (click)="modalSectorFilter = 'Finance'"
              >
                Finance
              </button>
              <button
                class="tab-pill"
                [ngClass]="{ 'tab-active': modalSectorFilter === 'Healthcare' }"
                (click)="modalSectorFilter = 'Healthcare'"
              >
                Healthcare
              </button>
            </div>
          </div>

          <!-- Modal Content Table / Grid -->
          <div class="modal-table-container">
            <table class="modal-market-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Sector</th>
                  <th class="text-center">Trend (Live)</th>
                  <th class="text-right">Live Price</th>
                  <th class="text-right">24h Change</th>
                  <th class="text-center">Status</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of filteredModalStocks" class="modal-table-row" [class.modal-row-flash-up]="flashingSymbols[s.symbol] === 'up'" [class.modal-row-flash-down]="flashingSymbols[s.symbol] === 'down'">
                  <td>
                    <div class="asset-cell">
                      <a [routerLink]="['/market', s.symbol]" (click)="closeMarketLeadersModal()" class="asset-symbol">
                        {{ s.symbol }}
                      </a>
                      <span class="asset-name">{{ s.companyName }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="sector-tag">{{ s.sector }}</span>
                  </td>
                  <td class="text-center">
                    <svg class="modal-sparkline" viewBox="0 0 64 22" width="76" height="26">
                      <path [attr.d]="getSparklineFillD(s.symbol)" [attr.fill]="getSparklineColor(s.symbol)" fill-opacity="0.18" />
                      <path [attr.d]="getSparklineD(s.symbol)" fill="none" [attr.stroke]="getSparklineColor(s.symbol)" stroke-width="2" stroke-linecap="round" />
                    </svg>
                  </td>
                  <td class="text-right">
                    <span class="modal-price font-bold" [ngClass]="flashingSymbols[s.symbol] === 'up' ? 'text-green' : (flashingSymbols[s.symbol] === 'down' ? 'text-red' : '')">
                      \${{ (liveQuotes[s.symbol]?.price || s.price) | number: getPriceFormat(s.symbol) }}
                    </span>
                  </td>
                  <td class="text-right">
                    <span
                      class="modal-change font-bold"
                      [ngClass]="(liveQuotes[s.symbol]?.change ?? 0) >= 0 ? 'text-green' : 'text-red'"
                    >
                      {{ (liveQuotes[s.symbol]?.change ?? 0) >= 0 ? '▲ +' : '▼ ' }}\${{ ((liveQuotes[s.symbol]?.change ?? 0) >= 0 ? (liveQuotes[s.symbol]?.change ?? 0) : -(liveQuotes[s.symbol]?.change ?? 0)) | number: getPriceFormat(s.symbol) }}
                      ({{ (liveQuotes[s.symbol]?.changePercent ?? 0) | number:'1.2-2' }}%)
                    </span>
                  </td>
                  <td class="text-center">
                    <span
                      class="market-badge-micro"
                      [ngClass]="(liveQuotes[s.symbol]?.marketStatus || 'OPEN') === 'OPEN' ? 'status-open' : 'status-closed'"
                    >
                      <span class="dot-indicator"></span> {{ liveQuotes[s.symbol]?.marketStatus || 'OPEN' }}
                    </span>
                  </td>
                  <td class="text-center">
                    <div class="modal-row-actions">
                      <a [routerLink]="['/market', s.symbol]" (click)="closeMarketLeadersModal()" class="btn-micro btn-micro-chart">
                        📊 Chart
                      </a>
                      <button class="btn-micro btn-micro-buy" (click)="openTradeForStock(s, 'BUY')">
                        ⚡ Buy
                      </button>
                      <button
                        class="btn-micro"
                        [ngClass]="isInWatchlist(s.id) ? 'btn-micro-active' : 'btn-micro-star'"
                        (click)="toggleWatchlist(s)"
                        [title]="isInWatchlist(s.id) ? 'Remove from Watchlist' : 'Add to Watchlist'"
                      >
                        {{ isInWatchlist(s.id) ? '★' : '☆' }}
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="filteredModalStocks.length === 0">
                  <td colspan="7" class="modal-empty-state">
                    <p>No market assets found matching "{{ modalSearchTerm }}"</p>
                    <button class="btn btn-sm btn-outline" (click)="modalSearchTerm = ''; modalSectorFilter = 'ALL'">Reset Filters</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <div class="modal-footer-stats">
              <span class="footer-stat-item">Total Leaders: <strong>{{ popularStocks.length }}</strong></span>
              <span class="footer-stat-item">Auto-Sync: <strong class="text-green">10s Active WebSocket / Polling</strong></span>
            </div>
            <div class="modal-footer-actions">
              <a routerLink="/market" (click)="closeMarketLeadersModal()" class="btn btn-outline">
                Open Full Market Screener →
              </a>
              <button class="btn btn-primary" (click)="closeMarketLeadersModal()">
                Close Window
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Trade Modal -->
      <app-trade-form
        *ngIf="selectedTradeStock"
        [stockId]="selectedTradeStock.id"
        [symbol]="selectedTradeStock.symbol"
        [companyName]="selectedTradeStock.companyName"
        [currentPrice]="selectedTradeStock.price"
        [initialType]="tradeActionType"
        (orderPlaced)="onOrderExecuted($event)"
        (close)="selectedTradeStock = null"
      ></app-trade-form>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 1.25rem;
      gap: 1.25rem;
      flex-wrap: wrap;
    }
    .welcome-box h1 {
      font-size: 1.85rem;
      color: #f8fafc;
      margin: 0 0 0.35rem 0;
    }
    .username-highlight {
      color: #38bdf8;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 0.9rem;
      margin: 0;
    }
    .quick-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .state-card {
      padding: 3.5rem;
      text-align: center;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      color: #94a3b8;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(56, 189, 248, 0.2);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .alert {
      padding: 1rem 1.25rem;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 500;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .alert-error {
      background-color: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #f87171;
    }
    .alert-success {
      background-color: rgba(16, 185, 129, 0.15);
      border: 1px solid #10b981;
      color: #34d399;
    }
    .btn-retry {
      background: #ef4444;
      color: #ffffff;
      border: none;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
    }
    .dashboard-body {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }
    .stat-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .stat-label {
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .stat-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: #f8fafc;
    }
    .stat-hint {
      color: #64748b;
      font-size: 0.75rem;
    }
    .stat-pill-wrapper {
      display: flex;
      align-items: center;
      margin: 0.15rem 0;
    }
    .stat-pill {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 1.15rem;
      font-weight: 800;
    }
    .pill-green {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .pill-red {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
    }
    .text-green { color: #34d399; }
    .text-red { color: #f87171; }
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 1.5rem;
    }
    @media (max-width: 1024px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }
    .grid-column {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .dashboard-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: 440px;
      box-sizing: border-box;
    }
    .scrollable-card-body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding-right: 0.25rem;
    }
    .scrollable-card-body::-webkit-scrollbar {
      width: 6px;
    }
    .scrollable-card-body::-webkit-scrollbar-track {
      background: #0b1120;
      border-radius: 4px;
    }
    .scrollable-card-body::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }
    .scrollable-card-body::-webkit-scrollbar-thumb:hover {
      background: #475569;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 0.85rem;
      flex-shrink: 0;
    }
    .card-title-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .card-header h3 {
      margin: 0 0 0.2rem 0;
      font-size: 1.15rem;
      color: #f8fafc;
    }
    .card-sub {
      margin: 0;
      color: #94a3b8;
      font-size: 0.8rem;
    }
    .card-action-link {
      color: #38bdf8;
      font-size: 0.825rem;
      font-weight: 600;
      text-decoration: none;
    }
    .card-action-link:hover {
      text-decoration: underline;
    }
    .empty-box {
      text-align: center;
      padding: 2.25rem 1rem;
      color: #94a3b8;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .empty-icon {
      font-size: 2rem;
    }
    .empty-box p {
      margin: 0;
      font-size: 0.875rem;
    }
    .table-wrapper {
      overflow-x: auto;
    }
    .dash-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .dash-table th {
      background-color: #1e293b;
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.65rem 0.85rem;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    .dash-table td {
      padding: 0.8rem 0.85rem;
      border-bottom: 1px solid #1e293b;
      color: #f1f5f9;
      font-size: 0.875rem;
    }
    .dash-table tr:last-child td {
      border-bottom: none;
    }
    .dash-table tr:hover td {
      background-color: rgba(30, 41, 59, 0.4);
    }
    .stock-cell {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .stock-sym {
      color: #38bdf8;
      font-weight: 700;
      text-decoration: none;
    }
    .stock-sym:hover {
      text-decoration: underline;
    }
    .stock-co {
      color: #64748b;
      font-size: 0.75rem;
      white-space: nowrap;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-muted { color: #94a3b8; font-size: 0.8rem; }
    .font-bold { font-weight: 700; }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.7rem;
      font-weight: 700;
    }
    .badge-buy {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .badge-sell {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
    }
    .badge-executed {
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #93c5fd;
    }
    .badge-watchlist-count {
      background: #1e293b;
      color: #38bdf8;
      border: 1px solid #334155;
    }
    .btn-micro {
      padding: 0.25rem 0.5rem;
      border-radius: 5px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }
    .btn-micro-trade {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }
    .btn-micro-trade:hover {
      background: #38bdf8;
      color: #0f172a;
    }
    .btn-micro-expand {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.35);
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-micro-expand:hover {
      background: #38bdf8;
      color: #0f172a;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
    }
    .live-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.65rem;
      font-weight: 800;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.35);
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      letter-spacing: 0.05em;
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .btn-micro-buy {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .btn-micro-buy:hover {
      background: #10b981;
      color: #ffffff;
    }
    .btn-micro-star {
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
    }
    .btn-micro-star:hover {
      color: #fbbf24;
      border-color: #fbbf24;
    }
    .btn-micro-active {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid #f59e0b;
    }
    .btn-micro-remove {
      background: transparent;
      color: #64748b;
      border: 1px solid transparent;
    }
    .btn-micro-remove:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }
    .popular-stocks-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .popular-stock-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 8px;
      transition: background-color 0.35s ease, border-color 0.35s ease;
    }
    .popular-stock-row.pop-flash-up {
      background-color: rgba(16, 185, 129, 0.14) !important;
      border-color: rgba(16, 185, 129, 0.45) !important;
    }
    .popular-stock-row.pop-flash-down {
      background-color: rgba(239, 68, 68, 0.14) !important;
      border-color: rgba(239, 68, 68, 0.45) !important;
    }
    .modal-table-row {
      transition: background-color 0.35s ease;
    }
    .modal-table-row.modal-row-flash-up td {
      background-color: rgba(16, 185, 129, 0.14) !important;
    }
    .modal-table-row.modal-row-flash-down td {
      background-color: rgba(239, 68, 68, 0.14) !important;
    }
    .hold-flash-up td {
      background-color: rgba(16, 185, 129, 0.14) !important;
    }
    .hold-flash-down td {
      background-color: rgba(239, 68, 68, 0.14) !important;
    }
    .pop-left {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .stock-sym-lg {
      background: #1e293b;
      color: #38bdf8;
      border: 1px solid #334155;
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      font-weight: 800;
      text-decoration: none;
      font-size: 0.95rem;
    }
    .stock-sym-lg:hover { border-color: #38bdf8; }
    .pop-details {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .pop-name {
      color: #f1f5f9;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .pop-sector {
      color: #64748b;
      font-size: 0.75rem;
    }
    .pop-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .pop-price {
      font-size: 1.05rem;
      font-weight: 800;
      color: #f8fafc;
    }
    .card-header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-micro-refresh {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: rgba(56, 189, 248, 0.12);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-micro-refresh:hover:not(:disabled) {
      background: #38bdf8;
      color: #0f172a;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
    }
    .btn-micro-refresh:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .refresh-micro-svg {
      flex-shrink: 0;
    }
    .quote-status-loading {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .micro-spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(56, 189, 248, 0.25);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin-quote 0.8s linear infinite;
    }
    @keyframes spin-quote {
      to { transform: rotate(360deg); }
    }
    .loading-label {
      color: #38bdf8;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .pop-quote-block {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.15rem;
    }
    .pop-price-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .market-badge-micro {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      letter-spacing: 0.03em;
    }
    .status-open {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .status-closed {
      background: rgba(100, 116, 139, 0.2);
      color: #94a3b8;
      border: 1px solid rgba(100, 116, 139, 0.3);
    }
    .dot-indicator {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }
    .pop-change-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.72rem;
    }
    .pop-change {
      font-weight: 600;
    }
    .pop-timestamp {
      color: #64748b;
      font-size: 0.68rem;
    }
    .pop-actions {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .watchlist-items-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .watchlist-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.65rem 0.85rem;
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 8px;
    }
    .watch-left {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .watch-company {
      color: #64748b;
      font-size: 0.75rem;
    }
    .watch-right {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    .watch-price {
      font-size: 0.95rem;
      color: #f8fafc;
    }
    .btn {
      padding: 0.55rem 1.1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-primary {
      background-color: #2563eb;
      color: #ffffff;
      border: 1px solid #2563eb;
    }
    .btn-primary:hover { background-color: #1d4ed8; }
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
    .btn-sm {
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
    }

    /* MARKET LEADERS EXPANDED WINDOW MODAL STYLES */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(3, 7, 18, 0.82);
      backdrop-filter: blur(8px);
      z-index: 1050;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .modal-dialog.modal-xl {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 16px;
      width: 100%;
      max-width: 1040px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(56, 189, 248, 0.15);
      animation: modal-appear 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modal-appear {
      from { opacity: 0; transform: scale(0.96) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.5rem 1.75rem 1.25rem 1.75rem;
      border-bottom: 1px solid #1e293b;
      gap: 1rem;
    }
    .modal-badge-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.25rem;
    }
    .modal-badge-title h2 {
      font-size: 1.4rem;
      color: #f8fafc;
      margin: 0;
      font-weight: 800;
    }
    .modal-subtitle {
      margin: 0;
      font-size: 0.85rem;
      color: #94a3b8;
    }
    .modal-close-btn {
      background: transparent;
      border: 1px solid #334155;
      color: #94a3b8;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }
    .modal-close-btn:hover {
      background: #ef4444;
      border-color: #ef4444;
      color: #ffffff;
    }
    .modal-toolbar {
      padding: 1rem 1.75rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      background: #0b1120;
      border-bottom: 1px solid #1e293b;
    }
    .search-input-wrapper {
      position: relative;
      flex: 1;
      min-width: 260px;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 0.85rem;
      font-size: 0.85rem;
      color: #64748b;
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      color: #f8fafc;
      border-radius: 8px;
      padding: 0.6rem 2rem 0.6rem 2.4rem;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .search-input:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }
    .clear-search-btn {
      position: absolute;
      right: 0.65rem;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .sector-tabs {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    .tab-pill {
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      padding: 0.4rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tab-pill:hover {
      color: #f8fafc;
      border-color: #64748b;
    }
    .tab-pill.tab-active {
      background: #2563eb;
      border-color: #2563eb;
      color: #ffffff;
      font-weight: 700;
    }
    .modal-table-container {
      flex: 1;
      overflow-y: auto;
      padding: 0 1.75rem;
      max-height: 480px;
    }
    .modal-table-container::-webkit-scrollbar {
      width: 8px;
    }
    .modal-table-container::-webkit-scrollbar-track {
      background: #0b1120;
    }
    .modal-table-container::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }
    .modal-market-table {
      width: 100%;
      border-collapse: collapse;
    }
    .modal-market-table th {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.85rem 0.75rem;
      border-bottom: 2px solid #1e293b;
      z-index: 2;
    }
    .modal-table-row td {
      padding: 0.85rem 0.75rem;
      border-bottom: 1px solid #1e293b;
      color: #f1f5f9;
      font-size: 0.875rem;
    }
    .modal-table-row:hover td {
      background-color: rgba(30, 41, 59, 0.4);
    }
    .asset-cell {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .asset-symbol {
      color: #38bdf8;
      font-weight: 800;
      text-decoration: none;
      font-size: 0.95rem;
    }
    .asset-symbol:hover {
      text-decoration: underline;
    }
    .asset-name {
      color: #94a3b8;
      font-size: 0.75rem;
      max-width: 180px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sector-tag {
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .modal-price {
      font-size: 0.95rem;
      color: #f8fafc;
    }
    .modal-change {
      font-size: 0.875rem;
    }
    .modal-row-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }
    .btn-micro-chart {
      background: rgba(56, 189, 248, 0.1);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      text-decoration: none;
    }
    .btn-micro-chart:hover {
      background: #38bdf8;
      color: #0f172a;
    }
    .modal-empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #94a3b8;
    }
    .modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.75rem;
      border-top: 1px solid #1e293b;
      background: #0b1120;
      border-bottom-left-radius: 16px;
      border-bottom-right-radius: 16px;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .modal-footer-stats {
      display: flex;
      gap: 1.5rem;
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .modal-footer-actions {
      display: flex;
      gap: 0.75rem;
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  isLoading = true;
  errorMessage = '';
  orderNotification = '';

  portfolio: Portfolio | null = null;
  topHoldings: Holding[] = [];
  recentOrders: OrderResponse[] = [];
  popularStocks: Stock[] = [];
  watchlist: WatchlistItem[] = [];

  // Real-time Market Data State
  liveQuotes: Record<string, MarketQuote> = {};
  quotesLoading: Record<string, boolean> = {};
  quotesError: Record<string, string> = {};
  flashingSymbols: Record<string, 'up' | 'down'> = {};
  isRefreshingMarket = false;

  // Market Leaders Window Modal State
  showMarketLeadersModal = false;
  modalSearchTerm = '';
  modalSectorFilter = 'ALL';

  // Modal State for Quick Buy/Sell
  selectedTradeStock: { id: number; symbol: string; companyName: string; price: number } | null = null;
  tradeActionType: 'BUY' | 'SELL' = 'BUY';
  private liveSubscription: Subscription | null = null;
  private liveTickTimer: any = null;

  constructor(
    public authService: AuthService,
    private portfolioService: PortfolioService,
    private marketService: MarketService,
    private marketDataService: MarketDataService,
    private watchlistService: WatchlistService,
    private tradeService: TradeService
  ) {}

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good Afternoon';
    } else if (hour >= 17 && hour < 21) {
      return 'Good Evening';
    } else {
      return 'Welcome';
    }
  }

  getGreetingIcon(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return '☀️';
    } else if (hour >= 12 && hour < 17) {
      return '🌤️';
    } else if (hour >= 17 && hour < 21) {
      return '🌆';
    } else {
      return '🌙';
    }
  }

  get filteredModalStocks(): Stock[] {
    return this.popularStocks.filter(s => {
      const matchSearch = !this.modalSearchTerm ||
        s.symbol.toLowerCase().includes(this.modalSearchTerm.toLowerCase()) ||
        s.companyName.toLowerCase().includes(this.modalSearchTerm.toLowerCase());
      
      const matchSector = this.modalSectorFilter === 'ALL' ||
        (this.modalSectorFilter === 'Forex' ? (s.sector?.includes('Forex') || s.symbol.includes('/')) : s.sector === this.modalSectorFilter);

      return matchSearch && matchSector;
    });
  }

  openMarketLeadersModal(): void {
    this.showMarketLeadersModal = true;
  }

  closeMarketLeadersModal(): void {
    this.showMarketLeadersModal = false;
  }

  refreshMarketLeadersNow(): void {
    this.isRefreshingMarket = true;
    this.marketService.getStocks().subscribe({
      next: (stocks) => {
        this.popularStocks = stocks || [];
        this.loadMarketQuotes();
        this.simulateMarketLeadersMicroTicks();
        setTimeout(() => {
          this.isRefreshingMarket = false;
        }, 750);
      },
      error: () => {
        this.loadMarketQuotes();
        this.simulateMarketLeadersMicroTicks();
        setTimeout(() => {
          this.isRefreshingMarket = false;
        }, 750);
      }
    });
  }

  ngOnInit(): void {
    this.loadAllDashboardData();

    // High-frequency live tick stream (fluctuations every 1.1s)
    this.liveTickTimer = setInterval(() => {
      if (this.popularStocks.length > 0 && !this.isLoading) {
        this.simulateMarketLeadersMicroTicks();
      }
    }, 1100);

    // Auto-stream quotes and mark-to-market every 10s
    this.liveSubscription = interval(10000).subscribe(() => {
      if (!this.isLoading) {
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

  simulateMarketLeadersMicroTicks(): void {
    const list = this.popularStocks;
    if (!list || list.length === 0) return;

    // Pick 3 to 7 random instruments across the universe to tick
    const count = Math.min(7, Math.max(3, Math.floor(list.length * 0.16)));
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * list.length);
      const stock = list[idx];
      if (!stock) continue;

      const sym = stock.symbol.trim().toUpperCase();
      const isFx = this.isForex(sym);
      const curQuote = this.liveQuotes[sym];
      const curPrice = curQuote ? curQuote.price : stock.price;

      // Subtle realistic micro-variance
      const deltaPct = (isFx ? 0.00028 : 0.0011) * (Math.random() - 0.49);
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
      }, 550);

      this.liveQuotes[sym] = {
        symbol: sym,
        price: newPrice,
        change: isFx ? Math.round(change * 10000) / 10000 : Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        timestamp: new Date().toISOString(),
        marketStatus: 'OPEN'
      };
    }

    this.updateHoldingsMarkToMarket();
  }

  updateHoldingsMarkToMarket(): void {
    if (!this.portfolio || !this.portfolio.holdings) return;

    let totalInvested = 0;
    let totalCurrentValue = 0;

    for (const h of this.portfolio.holdings) {
      const sym = (h.symbol || '').trim().toUpperCase();
      const buyPrice = h.averageBuyPrice || 100.0;
      const currentPrice = this.liveQuotes[sym]?.price ?? (h.currentPrice ?? buyPrice);
      h.currentPrice = currentPrice;
      h.currentValue = currentPrice * h.quantity;
      h.investedValue = buyPrice * h.quantity;
      h.profitLoss = h.currentValue - h.investedValue;
      h.profitLossPercent = h.investedValue > 0 ? (h.profitLoss / h.investedValue) * 100 : 0;

      totalInvested += h.investedValue;
      totalCurrentValue += h.currentValue;
    }

    this.portfolio.totalInvested = totalInvested;
    this.portfolio.currentValue = totalCurrentValue;
    this.portfolio.totalProfitLoss = totalCurrentValue - totalInvested;
    this.portfolio.profitLossPercent = totalInvested > 0 ? (this.portfolio.totalProfitLoss / totalInvested) * 100 : 0;

    this.topHoldings = this.portfolio.holdings
      .slice()
      .sort((a, b) => (b.currentValue ?? b.investedValue) - (a.currentValue ?? a.investedValue))
      .slice(0, 5);
  }

  pollQuotesSilently(): void {
    const symbols = (this.popularStocks.length > 0
      ? this.popularStocks.map(s => s.symbol)
      : ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL']
    ).map(s => s.trim().toUpperCase());

    this.marketDataService.getQuotes(symbols).subscribe({
      next: (quotes) => {
        for (const q of quotes) {
          if (q && q.symbol) {
            const sym = q.symbol.trim().toUpperCase();
            this.liveQuotes[sym] = q;
            delete this.quotesError[sym];
          }
        }
      },
      error: () => {}
    });
  }

  loadAllDashboardData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Load Portfolio
    this.portfolioService.getPortfolio().subscribe({
      next: (port) => {
        this.portfolio = port;
        this.topHoldings = (port.holdings || [])
          .slice()
          .sort((a, b) => (b.currentValue ?? b.investedValue) - (a.currentValue ?? a.investedValue))
          .slice(0, 5);
      },
      error: (err) => console.error('Failed to load portfolio:', err)
    });

    // Load Recent Orders
    this.tradeService.getOrders().subscribe({
      next: (orders) => {
        this.recentOrders = (orders || []).slice(0, 5);
      },
      error: (err) => console.error('Failed to load orders:', err)
    });

    // Load Popular Market Stocks & Fetch Live Quotes
    this.marketService.getStocks().subscribe({
      next: (stocks) => {
        this.popularStocks = stocks || [];
        this.loadMarketQuotes();
      },
      error: (err) => console.error('Failed to load stocks:', err)
    });

    // Load Watchlist
    this.watchlistService.getWatchlist().subscribe({
      next: (items) => {
        this.watchlist = items || [];
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to load watchlist:', err);
      }
    });
  }

  getSparklineD(symbol: string): string {
    const isUp = (this.liveQuotes[symbol]?.change ?? 0) >= 0;
    return isUp
      ? 'M 0,16 Q 14,13 26,8 T 46,10 T 64,3'
      : 'M 0,4 Q 16,9 30,14 T 48,11 T 64,18';
  }

  getSparklineFillD(symbol: string): string {
    const isUp = (this.liveQuotes[symbol]?.change ?? 0) >= 0;
    return isUp
      ? 'M 0,16 Q 14,13 26,8 T 46,10 T 64,3 L 64,22 L 0,22 Z'
      : 'M 0,4 Q 16,9 30,14 T 48,11 T 64,18 L 64,22 L 0,22 Z';
  }

  isForex(symbol: string): boolean {
    const s = (symbol || '').toUpperCase();
    return s.includes('/') && !s.includes('XAU') && !s.includes('XAG') && s !== 'GOLD' && s !== 'SILVER';
  }

  getPriceFormat(symbol: string): string {
    return this.isForex(symbol) ? '1.4-4' : '1.2-2';
  }

  getSparklineColor(symbol: string): string {
    const change = this.liveQuotes[symbol]?.change ?? 0;
    return change >= 0 ? '#10b981' : '#ef4444';
  }

  loadMarketQuotes(): void {
    // Initialize base quote values from stock price metadata so UI is never blank
    for (const s of this.popularStocks) {
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

    const symbols = (this.popularStocks.length > 0
      ? this.popularStocks.map(s => s.symbol)
      : ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL']
    ).map(s => s.trim().toUpperCase());

    for (const sym of symbols) {
      this.quotesLoading[sym] = true;
      delete this.quotesError[sym];
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
      error: () => {
        for (const sym of symbols) {
          this.quotesLoading[sym] = false;
        }
      }
    });
  }

  loadQuoteForSymbol(symbol: string): void {
    const cleanSym = symbol.trim().toUpperCase();
    this.quotesLoading[cleanSym] = true;
    delete this.quotesError[cleanSym];

    this.marketDataService.getQuote(cleanSym).subscribe({
      next: (quote) => {
        this.liveQuotes[cleanSym] = quote;
        this.quotesLoading[cleanSym] = false;
        delete this.quotesError[cleanSym];
      },
      error: (err) => {
        this.quotesLoading[cleanSym] = false;
        this.quotesError[cleanSym] = err?.message || 'Market data temporarily unavailable';
        console.warn(`Market quote unavailable for ${cleanSym}:`, err);
      }
    });
  }

  isInWatchlist(stockId: number): boolean {
    return this.watchlist.some(w => w.stockId === stockId);
  }

  toggleWatchlist(stock: Stock): void {
    if (this.isInWatchlist(stock.id)) {
      this.removeFromWatchlist(stock.id);
    } else {
      this.watchlistService.addToWatchlist(stock.id).subscribe({
        next: () => {
          this.watchlistService.getWatchlist().subscribe(items => this.watchlist = items || []);
        },
        error: (err) => alert(err?.error?.message || 'Failed to add to watchlist')
      });
    }
  }

  removeFromWatchlist(stockId: number): void {
    this.watchlistService.removeFromWatchlist(stockId).subscribe({
      next: () => {
        this.watchlist = this.watchlist.filter(w => w.stockId !== stockId);
      },
      error: (err) => alert(err?.error?.message || 'Failed to remove from watchlist')
    });
  }

  openQuickBuy(): void {
    if (this.popularStocks.length > 0) {
      const stock = this.popularStocks[0];
      const livePrice = this.liveQuotes[stock.symbol]?.price ?? stock.price;
      this.selectedTradeStock = {
        id: stock.id,
        symbol: stock.symbol,
        companyName: stock.companyName,
        price: livePrice
      };
      this.tradeActionType = 'BUY';
    }
  }

  openTradeForStock(stock: Stock, type: 'BUY' | 'SELL'): void {
    const livePrice = this.liveQuotes[stock.symbol]?.price ?? stock.price;
    this.selectedTradeStock = {
      id: stock.id,
      symbol: stock.symbol,
      companyName: stock.companyName,
      price: livePrice
    };
    this.tradeActionType = type;
  }

  openTradeForHolding(holding: Holding, type: 'BUY' | 'SELL'): void {
    this.selectedTradeStock = {
      id: holding.stockId,
      symbol: holding.symbol,
      companyName: holding.companyName,
      price: holding.currentPrice ?? holding.averageBuyPrice
    };
    this.tradeActionType = type;
  }

  openTradeFromWatchlist(item: WatchlistItem, type: 'BUY' | 'SELL'): void {
    this.selectedTradeStock = {
      id: item.stockId,
      symbol: item.symbol,
      companyName: item.companyName,
      price: item.price
    };
    this.tradeActionType = type;
  }

  onOrderExecuted(order: OrderResponse): void {
    this.orderNotification = `Order #${order.orderId} executed: ${order.type} ${order.quantity} shares of ${order.symbol} at \$${order.price.toFixed(2)}`;
    setTimeout(() => {
      this.orderNotification = '';
    }, 6000);
    this.loadAllDashboardData();
  }
}
