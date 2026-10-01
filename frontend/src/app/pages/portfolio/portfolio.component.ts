import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { PortfolioService } from '../../core/services/portfolio.service';
import { MarketDataService } from '../../core/services/market-data.service';
import { Holding, Portfolio } from '../../models/portfolio.model';
import { TradeFormComponent } from '../trading/trade-form/trade-form.component';
import { OrderResponse } from '../../models/order.model';
import { MarketQuote } from '../../models/market-quote.model';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, RouterLink, TradeFormComponent],
  template: `
    <div class="portfolio-container">
      <!-- Modern Spacious Page Header -->
      <div class="page-header">
        <div class="header-title-block">
          <div class="title-row">
            <h1>Portfolio & Holdings</h1>
            <span class="live-pulse-badge">
              <span class="pulse-dot"></span> LIVE VALUATION
            </span>
          </div>
          <p class="subtitle">Real-time tracking of your active positions, cost basis, unrealized returns, and portfolio performance</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" (click)="loadPortfolio()" [disabled]="isLoading" title="Refresh portfolio valuations">
            <svg class="btn-icon-svg" [class.spin-icon]="isRefreshing" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>Refresh</span>
          </button>
          <a routerLink="/market" class="btn btn-primary">
            <svg class="btn-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Explore Market</span>
          </a>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Calculating live mark-to-market valuations...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage && !isLoading" class="alert alert-error">
        <span class="error-msg">{{ errorMessage }}</span>
        <button class="btn btn-sm btn-retry" (click)="loadPortfolio()">Retry</button>
      </div>

      <div *ngIf="!isLoading && portfolio" class="portfolio-body">
        <!-- 4 Spacious, Premium Summary Cards -->
        <div class="summary-cards-grid">
          <!-- Total Invested Card -->
          <div class="stat-card">
            <div class="card-top-row">
              <span class="stat-label">Total Invested</span>
              <div class="card-icon-badge icon-cyan">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
              </div>
            </div>
            <div class="stat-value font-mono">\${{ portfolio.totalInvested | number:'1.2-2' }}</div>
            <div class="stat-meta">
              <span class="meta-label">Cost Basis</span>
              <span class="meta-sub">Original capital deployed</span>
            </div>
          </div>

          <!-- Current Market Value Card -->
          <div class="stat-card stat-card-highlight">
            <div class="card-top-row">
              <span class="stat-label">Current Value</span>
              <div class="card-icon-badge icon-blue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
            </div>
            <div class="stat-value font-mono text-cyan">\${{ (portfolio.currentValue ?? 0) | number:'1.2-2' }}</div>
            <div class="stat-meta">
              <span class="meta-label">Mark-to-Market</span>
              <span class="meta-sub">Live position worth</span>
            </div>
          </div>

          <!-- Total Profit / Loss Card -->
          <div class="stat-card">
            <div class="card-top-row">
              <span class="stat-label">Total Profit / Loss</span>
              <div class="card-icon-badge" [ngClass]="(portfolio.totalProfitLoss ?? 0) >= 0 ? 'icon-green' : 'icon-red'">
                <svg *ngIf="(portfolio.totalProfitLoss ?? 0) >= 0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
                <svg *ngIf="(portfolio.totalProfitLoss ?? 0) < 0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                  <polyline points="17 18 23 18 23 12"></polyline>
                </svg>
              </div>
            </div>
            <div
              class="stat-value font-mono"
              [ngClass]="(portfolio.totalProfitLoss ?? 0) >= 0 ? 'text-green' : 'text-red'"
            >
              {{ (portfolio.totalProfitLoss ?? 0) >= 0 ? '+' : '' }}\${{ (portfolio.totalProfitLoss ?? 0) | number:'1.2-2' }}
            </div>
            <div class="stat-meta">
              <span class="meta-label">Net Return</span>
              <span class="meta-sub">Realized + Unrealized</span>
            </div>
          </div>

          <!-- Profit / Loss % Card -->
          <div class="stat-card">
            <div class="card-top-row">
              <span class="stat-label">Return Rate %</span>
              <div class="card-icon-badge" [ngClass]="(portfolio.profitLossPercent ?? 0) >= 0 ? 'icon-green' : 'icon-red'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
            </div>
            <div class="stat-pill-row">
              <span
                class="return-badge-lg font-mono"
                [ngClass]="(portfolio.profitLossPercent ?? 0) >= 0 ? 'badge-green-lg' : 'badge-red-lg'"
              >
                {{ (portfolio.profitLossPercent ?? 0) >= 0 ? '▲ +' : '▼ ' }}{{ (portfolio.profitLossPercent ?? 0) | number:'1.2-2' }}%
              </span>
            </div>
            <div class="stat-meta">
              <span class="meta-label">Performance</span>
              <span class="meta-sub">Portfolio ROI %</span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="portfolio.holdings.length === 0" class="empty-state">
          <div class="empty-icon-box">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
              <polyline points="16 7 22 7 22 13"></polyline>
            </svg>
          </div>
          <h3>Your portfolio is currently empty</h3>
          <p>You haven't purchased any simulated stocks or gold commodities yet. Explore the market to start building your portfolio!</p>
          <a routerLink="/market" class="btn btn-primary btn-lg">
            Explore Market & Gold
          </a>
        </div>

        <!-- Spacious, Modern Holdings Table -->
        <div *ngIf="portfolio.holdings.length > 0" class="holdings-section">
          <div class="holdings-card">
            <div class="table-header-bar">
              <div class="table-title-group">
                <h2>Active Asset Holdings</h2>
                <span class="holdings-count-badge">{{ portfolio.holdings.length }} {{ portfolio.holdings.length === 1 ? 'Asset' : 'Assets' }}</span>
              </div>
              <div class="table-legend">
                <span class="legend-item"><span class="legend-dot dot-buy"></span> Avg Buy Price</span>
                <span class="legend-item"><span class="legend-dot dot-live"></span> Live Market Price</span>
              </div>
            </div>

            <div class="table-responsive">
              <table class="holdings-table">
                <thead>
                  <tr>
                    <th>Asset / Company</th>
                    <th class="text-center">Holdings</th>
                    <th class="text-right">Price (Avg → Live)</th>
                    <th class="text-right">Invested Capital</th>
                    <th class="text-right">Current Value</th>
                    <th class="text-center">Total Return (P/L)</th>
                    <th class="text-center">Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    *ngFor="let h of portfolio.holdings"
                    class="holding-row"
                    [class.row-flash-up]="flashingSymbols[h.symbol] === 'up'"
                    [class.row-flash-down]="flashingSymbols[h.symbol] === 'down'"
                  >
                    <!-- Asset Info -->
                    <td>
                      <div class="asset-info-cell">
                        <a
                          [routerLink]="['/market', h.symbol]"
                          class="symbol-tag"
                          [class.commodity-tag]="isCommodity(h.symbol)"
                          [class.forex-tag]="isForex(h.symbol)"
                        >
                          {{ h.symbol }}
                        </a>
                        <div class="asset-text">
                          <span class="company-title">{{ h.companyName }}</span>
                          <span class="asset-type-badge">{{ isCommodity(h.symbol) ? 'Precious Metal' : (isForex(h.symbol) ? 'Forex Pair' : 'Equities') }}</span>
                        </div>
                      </div>
                    </td>

                    <!-- Holdings Quantity -->
                    <td class="text-center">
                      <div class="quantity-box">
                        <span class="qty-num font-mono">{{ h.quantity | number:'1.0-4' }}</span>
                        <span class="qty-unit">{{ isCommodity(h.symbol) ? 'oz' : (isForex(h.symbol) ? 'lots' : 'shares') }}</span>
                      </div>
                    </td>

                    <!-- Price: Avg Buy -> Live Price with Flashing -->
                    <td class="text-right">
                      <div class="price-flow-cell">
                        <div class="price-line-live font-mono font-bold" [ngClass]="flashingSymbols[h.symbol] === 'up' ? 'text-green' : (flashingSymbols[h.symbol] === 'down' ? 'text-red' : '')">
                          \${{ (h.currentPrice ?? h.averageBuyPrice) | number: getPriceFormat(h.symbol) }}
                        </div>
                        <div class="price-line-avg font-mono text-muted">
                          avg \${{ h.averageBuyPrice | number: getPriceFormat(h.symbol) }}
                        </div>
                      </div>
                    </td>

                    <!-- Invested Capital -->
                    <td class="text-right">
                      <span class="capital-val font-mono font-bold">\${{ h.investedValue | number:'1.2-2' }}</span>
                    </td>

                    <!-- Current Valuation -->
                    <td class="text-right">
                      <span class="market-val font-mono font-bold text-cyan">\${{ (h.currentValue ?? h.investedValue) | number:'1.2-2' }}</span>
                    </td>

                    <!-- Total Return & Percentage Pill -->
                    <td class="text-center">
                      <div class="return-pill-wrapper">
                        <div
                          class="return-pill font-mono"
                          [ngClass]="(h.profitLoss ?? 0) >= 0 ? 'pill-green-soft' : 'pill-red-soft'"
                        >
                          <span class="return-dollar">
                            {{ (h.profitLoss ?? 0) >= 0 ? '+' : '' }}\${{ (h.profitLoss ?? 0) | number:'1.2-2' }}
                          </span>
                          <span class="return-pct">
                            ({{ (h.profitLossPercent ?? 0) >= 0 ? '+' : '' }}{{ (h.profitLossPercent ?? 0) | number:'1.2-2' }}%)
                          </span>
                        </div>
                      </div>
                    </td>

                    <!-- Action Buttons -->
                    <td class="text-center">
                      <div class="action-btn-group">
                        <button
                          class="btn-trade-pill btn-trade-buy"
                          (click)="openTrade(h, 'BUY')"
                          title="Buy more of this asset"
                        >
                          + Buy
                        </button>
                        <button
                          class="btn-trade-pill btn-trade-sell"
                          (click)="openTrade(h, 'SELL')"
                          title="Sell shares of this asset"
                        >
                          - Sell
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Beginner-Friendly Portfolio Explainer Tips -->
          <div class="beginner-tips-card">
            <div class="tip-header">
              <span class="tip-sparkle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </span>
              <h4>Quick Guide for Beginners: How Your Portfolio Works</h4>
            </div>
            <div class="tips-grid">
              <div class="tip-col">
                <strong class="tip-term">1. Cost Basis (Invested)</strong>
                <p>The total cash originally spent to acquire your shares (Quantity × Average Buy Price).</p>
              </div>
              <div class="tip-col">
                <strong class="tip-term">2. Mark-to-Market (Value)</strong>
                <p>What your assets are worth right now at current live exchange prices (Quantity × Live Price).</p>
              </div>
              <div class="tip-col">
                <strong class="tip-term">3. Unrealized Return (P/L)</strong>
                <p>Your estimated profit or loss if you choose to sell your position today.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Trade Form Modal -->
      <app-trade-form
        *ngIf="selectedHoldingForTrade"
        [stockId]="selectedHoldingForTrade.stockId"
        [symbol]="selectedHoldingForTrade.symbol"
        [companyName]="selectedHoldingForTrade.companyName"
        [currentPrice]="selectedHoldingForTrade.currentPrice ?? selectedHoldingForTrade.averageBuyPrice"
        [initialType]="tradeActionType"
        (orderPlaced)="onOrderPlaced($event)"
        (close)="selectedHoldingForTrade = null"
      ></app-trade-form>
    </div>
  `,
  styles: [`
    .portfolio-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 1440px;
      margin: 0 auto;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 1.5rem;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .header-title-block {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .page-header h1 {
      font-size: 2rem;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: -0.02em;
      margin: 0;
    }
    .live-pulse-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulseGlow 1.5s infinite;
    }
    @keyframes pulseGlow {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.4); opacity: 0.6; }
    }
    .subtitle {
      color: #94a3b8;
      font-size: 0.95rem;
      margin: 0;
      line-height: 1.5;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    /* Summary Metric Cards */
    .summary-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: linear-gradient(145deg, #0f172a 0%, #172033 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.6rem 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      border-color: rgba(56, 189, 248, 0.3);
    }
    .stat-card-highlight {
      background: linear-gradient(145deg, #0f1f38 0%, #132a4a 100%);
      border-color: rgba(56, 189, 248, 0.25);
    }
    .card-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .stat-label {
      color: #94a3b8;
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .card-icon-badge {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-cyan {
      background: rgba(56, 189, 248, 0.12);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }
    .icon-blue {
      background: rgba(37, 99, 235, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(37, 99, 235, 0.3);
    }
    .icon-green {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.35);
    }
    .icon-red {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.35);
    }
    .stat-value {
      font-size: 2rem;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: -0.01em;
      line-height: 1.1;
    }
    .stat-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 0.65rem;
      font-size: 0.78rem;
    }
    .meta-label {
      color: #cbd5e1;
      font-weight: 600;
    }
    .meta-sub {
      color: #64748b;
    }
    .stat-pill-row {
      margin: 0.2rem 0;
    }
    .return-badge-lg {
      display: inline-block;
      padding: 0.35rem 0.95rem;
      border-radius: 9999px;
      font-size: 1.35rem;
      font-weight: 800;
    }
    .badge-green-lg {
      background: rgba(16, 185, 129, 0.16);
      border: 1px solid rgba(16, 185, 129, 0.45);
      color: #34d399;
      text-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
    }
    .badge-red-lg {
      background: rgba(239, 68, 68, 0.16);
      border: 1px solid rgba(239, 68, 68, 0.45);
      color: #f87171;
      text-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
    }

    /* Holdings Section & Table */
    .holdings-section {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }
    .holdings-card {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 25px rgba(0, 0, 0, 0.2);
    }
    .table-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.4rem 1.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
      background: rgba(15, 23, 42, 0.7);
      flex-wrap: wrap;
      gap: 1rem;
    }
    .table-title-group {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .table-title-group h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
      color: #f8fafc;
    }
    .holdings-count-badge {
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
      padding: 0.2rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .table-legend {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      font-size: 0.78rem;
      color: #94a3b8;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .dot-buy { background: #64748b; }
    .dot-live { background: #38bdf8; }

    .table-responsive {
      overflow-x: auto;
    }
    .holdings-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .holdings-table th {
      background-color: #162032;
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    }
    .holdings-table td {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #f1f5f9;
      font-size: 0.95rem;
      transition: background-color 0.3s ease;
    }
    .holding-row:hover td {
      background-color: rgba(30, 41, 59, 0.45);
    }
    .row-flash-up td {
      background-color: rgba(16, 185, 129, 0.14) !important;
    }
    .row-flash-down td {
      background-color: rgba(239, 68, 68, 0.14) !important;
    }

    /* Asset Cell */
    .asset-info-cell {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .symbol-tag {
      display: inline-block;
      font-size: 0.95rem;
      font-weight: 800;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .symbol-tag:hover {
      background: rgba(56, 189, 248, 0.25);
      border-color: #38bdf8;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
    }
    .symbol-tag.commodity-tag {
      color: #fbbf24;
      background: rgba(251, 191, 36, 0.15);
      border-color: rgba(251, 191, 36, 0.35);
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.15);
    }
    .symbol-tag.forex-tag {
      color: #c084fc;
      background: rgba(192, 132, 252, 0.15);
      border-color: rgba(192, 132, 252, 0.35);
    }
    .asset-text {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .company-title {
      color: #f8fafc;
      font-weight: 700;
      font-size: 0.92rem;
    }
    .asset-type-badge {
      color: #64748b;
      font-size: 0.75rem;
    }

    /* Quantity Box */
    .quantity-box {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 0.35rem 0.85rem;
      border-radius: 8px;
    }
    .qty-num {
      font-size: 1rem;
      font-weight: 800;
      color: #f8fafc;
    }
    .qty-unit {
      font-size: 0.7rem;
      color: #94a3b8;
      text-transform: uppercase;
    }

    /* Price Flow */
    .price-flow-cell {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .price-line-live {
      font-size: 1rem;
      color: #f8fafc;
      transition: color 0.2s ease;
    }
    .price-line-avg {
      font-size: 0.78rem;
    }

    .capital-val {
      font-size: 1rem;
      color: #cbd5e1;
    }
    .market-val {
      font-size: 1.05rem;
    }

    /* Return Pill */
    .return-pill-wrapper {
      display: flex;
      justify-content: center;
    }
    .return-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.82rem;
      font-weight: 800;
    }
    .pill-green-soft {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .pill-red-soft {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
    }

    /* Action Buttons */
    .action-btn-group {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-trade-pill {
      padding: 0.4rem 0.9rem;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 800;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s ease;
    }
    .btn-trade-buy {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .btn-trade-buy:hover {
      background: #10b981;
      color: #0f172a;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
      transform: translateY(-1px);
    }
    .btn-trade-sell {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.4);
      color: #f87171;
    }
    .btn-trade-sell:hover {
      background: #ef4444;
      color: #ffffff;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
      transform: translateY(-1px);
    }

    /* Beginner Guidance Card */
    .beginner-tips-card {
      background: linear-gradient(145deg, #0b1120 0%, #111827 100%);
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 14px;
      padding: 1.5rem 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .tip-header {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .tip-sparkle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .tip-header h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: -0.01em;
    }
    .tips-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
    }
    .tip-col {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .tip-term {
      color: #38bdf8;
      font-size: 0.85rem;
      font-weight: 700;
    }
    .tip-col p {
      margin: 0;
      font-size: 0.82rem;
      color: #94a3b8;
      line-height: 1.5;
    }

    /* Common Buttons & Spinners */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.55rem 1.15rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background-color: #2563eb;
      color: #ffffff;
      border: 1px solid #3b82f6;
      box-shadow: 0 0 15px rgba(37, 99, 235, 0.35);
    }
    .btn-primary:hover {
      background-color: #1d4ed8;
      box-shadow: 0 0 20px rgba(37, 99, 235, 0.55);
      transform: translateY(-1px);
    }
    .btn-outline {
      border: 1px solid #334155;
      color: #e2e8f0;
      background: #1e293b;
    }
    .btn-outline:hover:not(:disabled) {
      border-color: #38bdf8;
      color: #38bdf8;
      background: #0f172a;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-icon-svg {
      flex-shrink: 0;
    }
    .spin-icon {
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-state, .empty-state {
      padding: 4rem 2rem;
      text-align: center;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      color: #94a3b8;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(56, 189, 248, 0.2);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .empty-icon-box {
      width: 80px;
      height: 80px;
      border-radius: 20px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.5rem;
    }
    .empty-state h3 {
      color: #f8fafc;
      font-size: 1.35rem;
      font-weight: 800;
      margin: 0;
    }
    .empty-state p {
      margin: 0;
      max-width: 480px;
      color: #94a3b8;
      line-height: 1.6;
    }
    .btn-lg {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
    }

    .alert-error {
      background-color: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #f87171;
      padding: 1rem 1.5rem;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-retry {
      background: #ef4444;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 0.35rem 0.75rem;
      font-weight: 700;
      cursor: pointer;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: monospace, ui-monospace; }
    .font-bold { font-weight: 700; }
    .text-green { color: #34d399; }
    .text-red { color: #f87171; }
    .text-cyan { color: #38bdf8; }
    .text-muted { color: #64748b; }
  `]
})
export class PortfolioComponent implements OnInit, OnDestroy {
  portfolio: Portfolio | null = null;
  isLoading = true;
  isRefreshing = false;
  errorMessage = '';

  flashingSymbols: Record<string, 'up' | 'down'> = {};
  liveQuotes: Record<string, MarketQuote> = {};

  selectedHoldingForTrade: Holding | null = null;
  tradeActionType: 'BUY' | 'SELL' = 'BUY';

  private liveTickTimer: any = null;
  private liveSubscription: Subscription | null = null;

  constructor(
    private portfolioService: PortfolioService,
    private marketDataService: MarketDataService
  ) {}

  isCommodity(symbol: string): boolean {
    const s = (symbol || '').toUpperCase();
    return s.includes('XAU') || s.includes('XAG') || s === 'GOLD' || s === 'SILVER';
  }

  isForex(symbol: string): boolean {
    const s = (symbol || '').toUpperCase();
    return s.includes('/') && !this.isCommodity(symbol);
  }

  getPriceFormat(symbol: string): string {
    return this.isForex(symbol) ? '1.4-4' : '1.2-2';
  }

  ngOnInit(): void {
    this.loadPortfolio();

    // High-frequency live tick fluctuations (every 1.2s)
    this.liveTickTimer = setInterval(() => {
      if (this.portfolio && this.portfolio.holdings && this.portfolio.holdings.length > 0 && !this.isLoading) {
        this.simulateHoldingTicks();
      }
    }, 1200);

    // Periodic live sync every 10s
    this.liveSubscription = interval(10000).subscribe(() => {
      if (!this.isLoading && this.portfolio && this.portfolio.holdings.length > 0) {
        this.pollQuotesSilently();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.liveTickTimer) {
      clearInterval(this.liveTickTimer);
      this.liveTickTimer = null;
    }
    if (this.liveSubscription) {
      this.liveSubscription.unsubscribe();
      this.liveSubscription = null;
    }
  }

  loadPortfolio(): void {
    this.isLoading = true;
    this.isRefreshing = true;
    this.errorMessage = '';

    this.portfolioService.getPortfolio().subscribe({
      next: (data) => {
        this.portfolio = data;
        this.isLoading = false;
        this.isRefreshing = false;
        this.fetchQuotesForHoldings(data.holdings);
      },
      error: (err) => {
        this.isLoading = false;
        this.isRefreshing = false;
        this.errorMessage = err?.error?.message || 'Failed to load portfolio data';
      }
    });
  }

  private fetchQuotesForHoldings(holdings: Holding[]): void {
    if (!holdings || holdings.length === 0) return;
    const symbols = holdings.map(h => h.symbol.trim().toUpperCase());

    this.marketDataService.getQuotes(symbols).subscribe({
      next: (quotes) => {
        for (const q of quotes) {
          if (q && q.symbol) {
            this.liveQuotes[q.symbol.trim().toUpperCase()] = q;
          }
        }
        this.recalculateValuations();
      },
      error: () => {}
    });
  }

  private pollQuotesSilently(): void {
    if (!this.portfolio || !this.portfolio.holdings) return;
    const symbols = this.portfolio.holdings.map(h => h.symbol.trim().toUpperCase());

    this.marketDataService.getQuotes(symbols).subscribe({
      next: (quotes) => {
        for (const q of quotes) {
          if (q && q.symbol) {
            this.liveQuotes[q.symbol.trim().toUpperCase()] = q;
          }
        }
        this.recalculateValuations();
      },
      error: () => {}
    });
  }

  private simulateHoldingTicks(): void {
    if (!this.portfolio || !this.portfolio.holdings || this.portfolio.holdings.length === 0) return;

    // Pick 1 to 3 holdings to tick
    const count = Math.min(3, Math.max(1, Math.floor(this.portfolio.holdings.length * 0.4)));
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * this.portfolio.holdings.length);
      const holding: Holding | undefined = this.portfolio.holdings[idx];
      if (!holding) continue;

      const sym = holding.symbol.trim().toUpperCase();
      const isFx = this.isForex(sym);
      const curQuote = this.liveQuotes[sym];
      const curPrice = curQuote ? curQuote.price : (holding.currentPrice ?? holding.averageBuyPrice);

      const deltaPct = (isFx ? 0.0003 : 0.0012) * (Math.random() - 0.49);
      let newPrice = curPrice + curPrice * deltaPct;
      if (newPrice <= 0) newPrice = curPrice;

      newPrice = isFx ? Math.round(newPrice * 10000) / 10000 : Math.round(newPrice * 100) / 100;

      const refPrice = holding.averageBuyPrice || curPrice;
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

    this.recalculateValuations();
  }

  private recalculateValuations(): void {
    if (!this.portfolio || !this.portfolio.holdings) return;

    let totalInvested = 0;
    let totalCurrentValue = 0;

    for (const h of this.portfolio.holdings) {
      const sym = h.symbol.trim().toUpperCase();
      const buyPrice = h.averageBuyPrice || 100.0;
      const curPrice = this.liveQuotes[sym]?.price ?? (h.currentPrice ?? buyPrice);

      h.currentPrice = curPrice;
      h.currentValue = curPrice * h.quantity;
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
  }

  openTrade(holding: Holding, type: 'BUY' | 'SELL'): void {
    this.selectedHoldingForTrade = holding;
    this.tradeActionType = type;
  }

  onOrderPlaced(order: OrderResponse): void {
    this.loadPortfolio();
  }
}
