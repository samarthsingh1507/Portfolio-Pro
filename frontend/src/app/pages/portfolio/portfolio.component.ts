import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PortfolioService } from '../../core/services/portfolio.service';
import { Holding, Portfolio } from '../../models/portfolio.model';
import { TradeFormComponent } from '../trading/trade-form/trade-form.component';
import { OrderResponse } from '../../models/order.model';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, RouterLink, TradeFormComponent],
  template: `
    <div class="portfolio-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Portfolio & Holdings</h1>
          <p class="subtitle">Live tracking of your simulated investments, positions, and performance</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" (click)="loadPortfolio()" [disabled]="isLoading">
            ↻ Refresh
          </button>
          <a routerLink="/market" class="btn btn-primary">
            + Explore Market
          </a>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-state">
        <p>Calculating portfolio valuations...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage" class="alert alert-error">
        {{ errorMessage }}
      </div>

      <div *ngIf="!isLoading && portfolio">
        <!-- 4 Summary Cards -->
        <div class="summary-cards">
          <!-- Total Invested -->
          <div class="stat-card">
            <span class="stat-label">Total Invested</span>
            <div class="stat-value">\${{ portfolio.totalInvested | number:'1.2-2' }}</div>
            <span class="stat-hint">Cumulative cost basis</span>
          </div>

          <!-- Current Value -->
          <div class="stat-card">
            <span class="stat-label">Current Value</span>
            <div class="stat-value">\${{ (portfolio.currentValue ?? 0) | number:'1.2-2' }}</div>
            <span class="stat-hint">Live mark-to-market</span>
          </div>

          <!-- Total P/L -->
          <div class="stat-card">
            <span class="stat-label">Total Profit / Loss</span>
            <div
              class="stat-value"
              [ngClass]="(portfolio.totalProfitLoss ?? 0) >= 0 ? 'text-green' : 'text-red'"
            >
              {{ (portfolio.totalProfitLoss ?? 0) >= 0 ? '+' : '' }}\${{ (portfolio.totalProfitLoss ?? 0) | number:'1.2-2' }}
            </div>
            <span class="stat-hint">Net dollar return</span>
          </div>

          <!-- P/L % -->
          <div class="stat-card">
            <span class="stat-label">Profit / Loss %</span>
            <div class="stat-pill-wrapper">
              <span
                class="stat-pill"
                [ngClass]="(portfolio.profitLossPercent ?? 0) >= 0 ? 'pill-green' : 'pill-red'"
              >
                {{ (portfolio.profitLossPercent ?? 0) >= 0 ? '▲ +' : '▼ ' }}{{ (portfolio.profitLossPercent ?? 0) | number:'1.2-2' }}%
              </span>
            </div>
            <span class="stat-hint">Overall portfolio return</span>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="portfolio.holdings.length === 0" class="empty-state">
          <div class="empty-icon">📈</div>
          <h3>Your portfolio is currently empty</h3>
          <p>You have not purchased any simulated stock shares yet. Head over to the Market directory to execute your first simulated trade!</p>
          <a routerLink="/market" class="btn btn-primary">
            Explore Seeded Stocks
          </a>
        </div>

        <!-- Holdings Table -->
        <div *ngIf="portfolio.holdings.length > 0" class="table-card">
          <div class="table-header-title">
            <h2>Current Holdings ({{ portfolio.holdings.length }})</h2>
          </div>
          <table class="holdings-table">
            <thead>
              <tr>
                <th>Stock</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Average Buy</th>
                <th class="text-right">Current Price</th>
                <th class="text-right">Invested</th>
                <th class="text-right">Current Value</th>
                <th class="text-right">P / L</th>
                <th class="text-right">P / L %</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let holding of portfolio.holdings">
                <td>
                  <div class="stock-info">
                    <a [routerLink]="['/market', holding.symbol]" class="symbol-link">
                      {{ holding.symbol }}
                    </a>
                    <span class="company-sub">{{ holding.companyName }}</span>
                  </div>
                </td>
                <td class="text-right font-bold">{{ holding.quantity }}</td>
                <td class="text-right">\${{ holding.averageBuyPrice | number:'1.2-2' }}</td>
                <td class="text-right font-bold">\${{ (holding.currentPrice ?? 0) | number:'1.2-2' }}</td>
                <td class="text-right">\${{ holding.investedValue | number:'1.2-2' }}</td>
                <td class="text-right font-bold">\${{ (holding.currentValue ?? 0) | number:'1.2-2' }}</td>
                <td
                  class="text-right font-bold"
                  [ngClass]="(holding.profitLoss ?? 0) >= 0 ? 'text-green' : 'text-red'"
                >
                  {{ (holding.profitLoss ?? 0) >= 0 ? '+' : '' }}\${{ (holding.profitLoss ?? 0) | number:'1.2-2' }}
                </td>
                <td class="text-right">
                  <span
                    class="badge"
                    [ngClass]="(holding.profitLossPercent ?? 0) >= 0 ? 'badge-green' : 'badge-red'"
                  >
                    {{ (holding.profitLossPercent ?? 0) >= 0 ? '+' : '' }}{{ (holding.profitLossPercent ?? 0) | number:'1.2-2' }}%
                  </span>
                </td>
                <td class="text-center action-col">
                  <div class="btn-group">
                    <button
                      class="btn-action btn-buy"
                      (click)="openTrade(holding, 'BUY')"
                      title="Buy more shares"
                    >
                      Buy
                    </button>
                    <button
                      class="btn-action btn-sell"
                      (click)="openTrade(holding, 'SELL')"
                      title="Sell shares"
                    >
                      Sell
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Trade Form Modal -->
      <app-trade-form
        *ngIf="selectedHoldingForTrade"
        [stockId]="selectedHoldingForTrade.stockId"
        [symbol]="selectedHoldingForTrade.symbol"
        [companyName]="selectedHoldingForTrade.companyName"
        [currentPrice]="selectedHoldingForTrade.currentPrice ?? 0"
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
      gap: 1.75rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 1.25rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .page-header h1 {
      font-size: 1.85rem;
      color: #f8fafc;
      margin: 0 0 0.25rem 0;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 0.9rem;
      margin: 0;
    }
    .header-actions {
      display: flex;
      gap: 0.75rem;
    }
    .loading-state, .empty-state {
      padding: 3.5rem 1.5rem;
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
    .empty-state p {
      margin-bottom: 1.5rem;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.5;
    }
    .alert-error {
      background-color: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #f87171;
      padding: 1rem;
      border-radius: 8px;
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
      margin: 0.25rem 0;
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
    .text-green {
      color: #34d399;
    }
    .text-red {
      color: #f87171;
    }
    .table-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      overflow-x: auto;
    }
    .table-header-title {
      padding: 1.25rem 1.5rem 0.75rem;
      border-bottom: 1px solid #1e293b;
    }
    .table-header-title h2 {
      margin: 0;
      font-size: 1.15rem;
      color: #f8fafc;
    }
    .holdings-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .holdings-table th {
      background-color: #1e293b;
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.875rem 1.25rem;
    }
    .holdings-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #1e293b;
      color: #f1f5f9;
      font-size: 0.95rem;
    }
    .holdings-table tr:last-child td {
      border-bottom: none;
    }
    .holdings-table tr:hover td {
      background-color: rgba(30, 41, 59, 0.5);
    }
    .stock-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .symbol-link {
      color: #38bdf8;
      font-weight: 700;
      text-decoration: none;
      font-size: 1.05rem;
    }
    .symbol-link:hover {
      text-decoration: underline;
    }
    .company-sub {
      color: #64748b;
      font-size: 0.8rem;
    }
    .text-center {
      text-align: center;
    }
    .text-right {
      text-align: right;
    }
    .font-bold {
      font-weight: 700;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .badge-green {
      background-color: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .badge-red {
      background-color: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
    }
    .action-col {
      white-space: nowrap;
    }
    .btn-group {
      display: inline-flex;
      gap: 0.4rem;
    }
    .btn-action {
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }
    .btn-buy {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .btn-buy:hover {
      background: #10b981;
      color: #ffffff;
    }
    .btn-sell {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
    }
    .btn-sell:hover {
      background: #ef4444;
      color: #ffffff;
    }
    .btn {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      display: inline-block;
    }
    .btn-primary {
      background-color: #2563eb;
      color: #ffffff;
      border: 1px solid #2563eb;
    }
    .btn-primary:hover {
      background-color: #1d4ed8;
    }
    .btn-outline {
      border: 1px solid #334155;
      color: #e2e8f0;
      background: transparent;
    }
    .btn-outline:hover:not(:disabled) {
      background-color: #1e293b;
      border-color: #38bdf8;
      color: #38bdf8;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class PortfolioComponent implements OnInit {
  portfolio: Portfolio | null = null;
  isLoading = true;
  errorMessage = '';

  selectedHoldingForTrade: Holding | null = null;
  tradeActionType: 'BUY' | 'SELL' = 'BUY';

  constructor(private portfolioService: PortfolioService) {}

  ngOnInit(): void {
    this.loadPortfolio();
  }

  loadPortfolio(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.portfolioService.getPortfolio().subscribe({
      next: (data) => {
        this.portfolio = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to load portfolio data';
      }
    });
  }

  openTrade(holding: Holding, type: 'BUY' | 'SELL'): void {
    this.selectedHoldingForTrade = holding;
    this.tradeActionType = type;
  }

  onOrderPlaced(order: OrderResponse): void {
    this.loadPortfolio();
  }
}
