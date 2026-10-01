import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { PortfolioService } from '../../core/services/portfolio.service';
import { AnalysisService } from '../../core/services/analysis.service';
import { MarketService } from '../../core/services/market.service';
import { MarketDataService } from '../../core/services/market-data.service';
import { PortfolioAnalytics, AllocationItem } from '../../models/portfolio.model';
import { TechnicalAnalysis, FundamentalAnalysis } from '../../models/analysis.model';
import { StockResponse } from '../../models/stock.model';
import { MarketQuote } from '../../models/market-quote.model';

interface ChartPoint {
  x: number;
  y: number;
  date: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  highY?: number;
  lowY?: number;
  bodyTop?: number;
  bodyHeight?: number;
  width?: number;
  isBullish?: boolean;
  changeFromStart?: number;
  ma20?: number;
  ma50?: number;
}

interface DonutSegment {
  symbol: string;
  percentage: number;
  color: string;
  dashArray: string;
  dashOffset: number;
}

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="analysis-page">
      <!-- Page Navigation Header -->
      <div class="page-header">
        <div>
          <h1>Risk & Performance Analytics</h1>
          <p class="subtitle">Simulated portfolio diversification, concentration risk, and asset allocation</p>
        </div>

        <!-- Navigation Tabs -->
        <div class="view-tabs">
          <button
            class="tab-btn"
            [class.active]="activeTab === 'portfolio'"
            (click)="activeTab = 'portfolio'"
          >
            📊 Portfolio Risk & Allocation
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab === 'stock'"
            (click)="activeTab = 'stock'"
          >
            📈 Stock Technicals & Fundamentals
          </button>
        </div>
      </div>

      <!-- TAB 1: PORTFOLIO RISK & PERFORMANCE ANALYTICS -->
      <div *ngIf="activeTab === 'portfolio'" class="portfolio-analytics-view">
        <!-- Loading State -->
        <div *ngIf="isLoadingAnalytics" class="state-card">
          <div class="spinner"></div>
          <p>Calculating portfolio risk metrics & allocations...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="analyticsError && !isLoadingAnalytics" class="alert alert-error">
          <span>{{ analyticsError }}</span>
          <button class="btn btn-sm btn-retry" (click)="loadPortfolioAnalytics()">Retry</button>
        </div>

        <div *ngIf="!isLoadingAnalytics && analytics" class="analytics-content">
          <!-- 4 Portfolio Performance Cards -->
          <div class="section-title-row">
            <h2>Portfolio Performance</h2>
            <button class="btn btn-sm btn-outline" (click)="loadPortfolioAnalytics()">↻ Refresh</button>
          </div>

          <div class="performance-cards">
            <!-- Total Invested -->
            <div class="perf-card">
              <span class="card-label">Total Invested</span>
              <div class="card-val">\${{ analytics.totalInvested | number:'1.2-2' }}</div>
              <span class="card-sub">Initial cost basis</span>
            </div>

            <!-- Current Value -->
            <div class="perf-card">
              <span class="card-label">Current Value</span>
              <div class="card-val">\${{ analytics.currentValue | number:'1.2-2' }}</div>
              <span class="card-sub">Mark-to-market total</span>
            </div>

            <!-- Total P/L -->
            <div class="perf-card">
              <span class="card-label">Total Profit / Loss</span>
              <div
                class="card-val"
                [ngClass]="analytics.totalProfitLoss >= 0 ? 'text-green' : 'text-red'"
              >
                {{ analytics.totalProfitLoss >= 0 ? '+' : '' }}\${{ analytics.totalProfitLoss | number:'1.2-2' }}
              </div>
              <span class="card-sub">Net dollar return</span>
            </div>

            <!-- P/L % -->
            <div class="perf-card">
              <span class="card-label">Profit / Loss %</span>
              <div class="pill-container">
                <span
                  class="badge-pill"
                  [ngClass]="analytics.profitLossPercent >= 0 ? 'pill-green' : 'pill-red'"
                >
                  {{ analytics.profitLossPercent >= 0 ? '▲ +' : '▼ ' }}{{ analytics.profitLossPercent | number:'1.2-2' }}%
                </span>
              </div>
              <span class="card-sub">Cumulative return</span>
            </div>
          </div>

          <!-- Diversification & Risk Indicator Cards -->
          <div class="risk-indicators-grid">
            <!-- Diversification Card -->
            <div class="risk-card">
              <div class="risk-card-header">
                <span class="risk-label">Diversification Level</span>
                <span class="badge" [ngClass]="getDiversificationClass(analytics.diversification)">
                  {{ analytics.diversification }}
                </span>
              </div>
              <div class="risk-main-stat">
                {{ analytics.numberOfHoldings }} Active Holding{{ analytics.numberOfHoldings === 1 ? '' : 's' }}
              </div>
              <p class="risk-description">
                {{ getDiversificationDescription(analytics.diversification) }}
              </p>
            </div>

            <!-- Risk Indicator Card -->
            <div class="risk-card">
              <div class="risk-card-header">
                <span class="risk-label">Portfolio Risk Indicator</span>
                <span class="badge" [ngClass]="getRiskIndicatorClass(analytics.riskIndicator)">
                  {{ analytics.riskIndicator }}
                </span>
              </div>
              <div class="risk-main-stat">
                {{ getRiskSummary(analytics.riskIndicator) }}
              </div>
              <p class="risk-description">
                {{ getRiskDescription(analytics.riskIndicator) }}
              </p>
            </div>
          </div>

          <!-- Educational Disclaimer Banner -->
          <div class="disclaimer-banner">
            <span class="disclaimer-icon">ℹ</span>
            <div class="disclaimer-text">
              <strong>Simulated Demo Indicator:</strong> This risk and diversification assessment is an educational demonstration metric based on holding concentration. It is not professional financial, tax, or investment advice.
            </div>
          </div>

          <!-- Portfolio Allocation Chart Section -->
          <div class="card allocation-card">
            <div class="card-header">
              <div>
                <h3>Asset Allocation Breakdown</h3>
                <p class="card-sub">Current distribution of capital across individual portfolio holdings</p>
              </div>
            </div>

            <!-- Empty Allocation State -->
            <div *ngIf="analytics.allocation.length === 0" class="empty-allocation">
              <div class="empty-icon">🥧</div>
              <h4>No active holdings to allocate</h4>
              <p>You haven't placed any simulated trades yet. Visit the Market directory to start building your simulated portfolio.</p>
              <a routerLink="/market" class="btn btn-primary">Go to Market Directory</a>
            </div>

            <!-- Allocation Chart & Legend -->
            <div *ngIf="analytics.allocation.length > 0" class="allocation-layout">
              <!-- Visual Donut Chart -->
              <div class="donut-chart-wrapper">
                <svg class="donut-svg" viewBox="0 0 280 280">
                  <circle
                    cx="140"
                    cy="140"
                    r="80"
                    fill="transparent"
                    stroke="#1e293b"
                    stroke-width="36"
                  />
                  <circle
                    *ngFor="let seg of donutSegments"
                    cx="140"
                    cy="140"
                    r="80"
                    fill="transparent"
                    [attr.stroke]="seg.color"
                    stroke-width="36"
                    [attr.stroke-dasharray]="seg.dashArray"
                    [attr.stroke-dashoffset]="seg.dashOffset"
                    transform="rotate(-90 140 140)"
                  />
                  <!-- Inner Donut Text -->
                  <text x="140" y="132" text-anchor="middle" class="donut-center-title">TOTAL</text>
                  <text x="140" y="156" text-anchor="middle" class="donut-center-value">
                    \${{ analytics.currentValue | number:'1.0-0' }}
                  </text>
                </svg>
              </div>

              <!-- Allocation Table / List -->
              <div class="allocation-list-container">
                <!-- Stacked Progress Bar -->
                <div class="stacked-bar">
                  <div
                    *ngFor="let item of analytics.allocation; let i = index"
                    class="bar-segment"
                    [style.width.%]="item.percentage"
                    [style.background-color]="getAllocationColor(i)"
                    [title]="item.symbol + ': ' + item.percentage + '%'"
                  ></div>
                </div>

                <div class="allocation-items-list">
                  <div
                    *ngFor="let item of analytics.allocation; let i = index"
                    class="allocation-item-row"
                  >
                    <div class="item-left">
                      <span class="color-dot" [style.background-color]="getAllocationColor(i)"></span>
                      <a [routerLink]="['/market', item.symbol]" class="item-symbol">
                        {{ item.symbol }}
                      </a>
                      <span *ngIf="item.companyName" class="item-company">{{ item.companyName }}</span>
                    </div>

                    <div class="item-right">
                      <span *ngIf="item.currentValue" class="item-value">
                        \${{ item.currentValue | number:'1.2-2' }}
                      </span>
                      <span class="item-pct font-bold">
                        {{ item.percentage | number:'1.2-2' }}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: INDIVIDUAL STOCK TECHNICAL & FUNDAMENTAL ANALYSIS -->
      <div *ngIf="activeTab === 'stock'" class="stock-analysis-view">
        <div class="analysis-search-bar-row">
          <!-- Universal Live Global Search Input -->
          <div class="global-search-container">
            <div class="search-input-wrapper">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (input)="onSearchInput()"
                (keydown.enter)="onSearchEnter()"
                (focus)="showSearchDropdown = searchResults.length > 0"
                placeholder="Search any company, ticker, or forex pair worldwide (e.g. AAPL, EUR/USD, NVDA, BABA, TSLA)..."
                class="global-search-input"
              />
              <span *ngIf="isSearching" class="search-spinner"></span>
              <button *ngIf="searchQuery" class="clear-search-btn" (click)="searchQuery = ''; searchResults = []; showSearchDropdown = false">✕</button>
            </div>

            <!-- Dropdown Results -->
            <div *ngIf="showSearchDropdown && searchResults.length > 0" class="search-dropdown-menu">
              <div class="dropdown-header">
                <span>Matching Worldwide Assets ({{ searchResults.length }})</span>
                <span class="dropdown-hint">Click or press Enter</span>
              </div>
              <div
                *ngFor="let res of searchResults"
                class="search-result-item"
                (click)="selectSearchResult(res)"
              >
                <div class="res-left">
                  <span class="res-symbol">{{ res.symbol }}</span>
                  <span class="res-name">{{ res.description }}</span>
                </div>
                <div class="res-right">
                  <span class="res-tag" [class.forex-tag]="res.symbol.includes('/')">{{ res.type || 'Stock' }}</span>
                  <span class="res-ex">{{ res.exchange || 'US' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Selector Dropdown for Preloaded Instruments -->
          <div class="quick-select-box">
            <label for="stockSelect" class="selector-label">Or Select Preset:</label>
            <select
              id="stockSelect"
              [(ngModel)]="selectedSymbol"
              (change)="onSymbolChange()"
              class="stock-select"
              [disabled]="isLoadingStocks"
            >
              <option *ngFor="let s of availableStocks" [value]="s.symbol">
                {{ s.symbol }} — {{ s.companyName }} (\${{ s.price | number:(s.symbol.includes('/') ? '1.4-4' : '1.2-2') }})
              </option>
            </select>
          </div>
        </div>

        <!-- Stock Loading -->
        <div *ngIf="isLoadingStockAnalysis" class="state-card">
          <div class="spinner"></div>
          <p>Loading real-time market data & candlestick technicals for {{ selectedSymbol }}...</p>
        </div>

        <!-- Stock Error -->
        <div *ngIf="stockError && !isLoadingStockAnalysis" class="alert alert-error">
          <span>{{ stockError }}</span>
          <button class="btn btn-sm btn-retry" (click)="loadStockAnalysis(selectedSymbol)">Retry</button>
        </div>

        <div *ngIf="!isLoadingStockAnalysis && technicalData && fundamentalData" class="stock-analysis-content">
          <!-- Stock Header Banner -->
          <div class="overview-banner">
            <div class="stock-meta">
              <div class="badge-row">
                <span class="symbol-pill" [class.forex-pill]="isForex">{{ technicalData.symbol }}</span>
                <span class="sector-pill">{{ fundamentalData.sector }}</span>
                <span class="rsi-pill" [ngClass]="getRsiBadgeClass(technicalData.rsi14)">
                  RSI(14): {{ technicalData.rsi14 | number:'1.2-2' }} ({{ getRsiCondition(technicalData.rsi14) }})
                </span>
                <span class="live-stream-badge">
                  <span class="pulse-dot"></span> LIVE AUTO-STREAM
                </span>
              </div>
              <h2>{{ fundamentalData.companyName }}</h2>
            </div>

            <div class="price-box">
              <span class="price-title">Current Market Price</span>
              <span class="price-number">\${{ (liveQuote?.price ?? technicalData.currentPrice) | number:(isForex ? '1.4-4' : '1.2-2') }}</span>
              <a [routerLink]="['/market', technicalData.symbol]" class="link-trade">
                Open in Full Trading Desk →
              </a>
            </div>
          </div>

          <!-- TradingView-Style Price Chart & Overlays -->
          <div class="card chart-card">
            <div class="card-header tv-header-line">
              <div class="tv-hud-left">
                <div class="tv-hud-title-line">
                  <span class="tv-symbol-bold">{{ technicalData.symbol }}</span>
                  <span class="tv-dot">·</span>
                  <span class="tv-tf-pill">{{ selectedTimeframe }}</span>
                  <span class="tv-dot">·</span>
                  <span class="tv-live-source">Twelve Data Real-Time</span>
                </div>
                <!-- Live TradingView OHLC Readout HUD -->
                <div class="tv-ohlc-readout" *ngIf="currentOHLC">
                  <span class="hud-pair"><span class="hud-k">O</span> <span class="hud-v">\${{ currentOHLC.open | number:(isForex ? '1.4-4' : '1.2-2') }}</span></span>
                  <span class="hud-pair"><span class="hud-k">H</span> <span class="hud-v text-green">\${{ currentOHLC.high | number:(isForex ? '1.4-4' : '1.2-2') }}</span></span>
                  <span class="hud-pair"><span class="hud-k">L</span> <span class="hud-v text-red">\${{ currentOHLC.low | number:(isForex ? '1.4-4' : '1.2-2') }}</span></span>
                  <span class="hud-pair"><span class="hud-k">C</span> <span class="hud-v font-bold">\${{ currentOHLC.close | number:(isForex ? '1.4-4' : '1.2-2') }}</span></span>
                  <span class="hud-pair" [ngClass]="currentOHLC.change >= 0 ? 'text-green' : 'text-red'">
                    {{ currentOHLC.change >= 0 ? '+' : '' }}\${{ currentOHLC.change | number:(isForex ? '1.4-4' : '1.2-2') }} ({{ currentOHLC.changePercent | number:'1.2-2' }}%)
                  </span>
                </div>
              </div>

              <div class="chart-controls-wrapper">
                <!-- Professional Chart Type Selector with SVG Icons -->
                <div class="chart-type-pills">
                  <button
                    class="type-btn"
                    [class.active]="chartType === 'candle'"
                    (click)="setChartType('candle')"
                    title="Candlestick OHLC View"
                  >
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" class="chart-svg-icon">
                      <line x1="4.5" y1="1" x2="4.5" y2="15" stroke="#f23645" stroke-width="1.2" stroke-linecap="round"/>
                      <rect x="2.5" y="4" width="4" height="6" fill="#f23645" rx="0.5"/>
                      <line x1="11.5" y1="1" x2="11.5" y2="15" stroke="#089981" stroke-width="1.2" stroke-linecap="round"/>
                      <rect x="9.5" y="6" width="4" height="7" fill="#089981" rx="0.5"/>
                    </svg>
                    <span>Candles</span>
                  </button>
                  <button
                    class="type-btn"
                    [class.active]="chartType === 'line'"
                    (click)="setChartType('line')"
                    title="Line & Area Chart"
                  >
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" class="chart-svg-icon">
                      <path d="M2 12 L6 7 L10 9 L14 3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <circle cx="14" cy="3" r="1.5" fill="#38bdf8"/>
                    </svg>
                    <span>Line</span>
                  </button>
                </div>

                <!-- Timeframe Selector -->
                <div class="timeframe-pills">
                  <button
                    *ngFor="let tf of timeframes"
                    class="tf-btn"
                    [class.active]="selectedTimeframe === tf"
                    (click)="setTimeframe(tf)"
                  >
                    {{ tf }}
                  </button>
                </div>

                <div class="chart-toggles">
                  <label class="toggle-item">
                    <input type="checkbox" [(ngModel)]="showMA20" (change)="buildChartPaths()" />
                    <span class="legend-indicator ma20-ind"></span> MA20
                  </label>
                  <label class="toggle-item">
                    <input type="checkbox" [(ngModel)]="showMA50" (change)="buildChartPaths()" />
                    <span class="legend-indicator ma50-ind"></span> MA50
                  </label>
                </div>
              </div>
            </div>

            <div
              class="svg-container tv-svg-container"
              (mousemove)="onChartMouseMove($event)"
              (mouseleave)="hoveredPoint = null"
            >
              <!-- Active hovered point tooltip -->
              <div
                *ngIf="hoveredPoint"
                class="chart-tooltip"
                [style.left.px]="tooltipX"
                [style.top.px]="tooltipY"
              >
                <div class="tooltip-header">
                  <span class="tt-date">{{ hoveredPoint.date }}</span>
                  <span
                    *ngIf="hoveredPoint.changeFromStart !== undefined"
                    class="tooltip-pct"
                    [ngClass]="hoveredPoint.changeFromStart >= 0 ? 'text-green' : 'text-red'"
                  >
                    {{ hoveredPoint.changeFromStart >= 0 ? '+' : '' }}{{ hoveredPoint.changeFromStart | number:'1.2-2' }}%
                  </span>
                </div>

                <!-- OHLC Grid Readout -->
                <div class="tooltip-ohlc-grid">
                  <div class="ohlc-cell">
                    <span class="ohlc-lbl">Open:</span>
                    <span class="ohlc-val">\${{ (hoveredPoint.open ?? hoveredPoint.price) | number: (isForex ? '1.4-4' : '1.2-2') }}</span>
                  </div>
                  <div class="ohlc-cell">
                    <span class="ohlc-lbl">High:</span>
                    <span class="ohlc-val text-green">\${{ (hoveredPoint.high ?? hoveredPoint.price) | number: (isForex ? '1.4-4' : '1.2-2') }}</span>
                  </div>
                  <div class="ohlc-cell">
                    <span class="ohlc-lbl">Low:</span>
                    <span class="ohlc-val text-red">\${{ (hoveredPoint.low ?? hoveredPoint.price) | number: (isForex ? '1.4-4' : '1.2-2') }}</span>
                  </div>
                  <div class="ohlc-cell">
                    <span class="ohlc-lbl">Close:</span>
                    <span class="ohlc-val font-bold">\${{ (hoveredPoint.close ?? hoveredPoint.price) | number: (isForex ? '1.4-4' : '1.2-2') }}</span>
                  </div>
                </div>

                <div class="tooltip-ma-row" *ngIf="showMA20 && hoveredPoint.ma20">
                  <span class="ma-dot ma20-dot"></span> MA20: \${{ hoveredPoint.ma20 | number: (isForex ? '1.4-4' : '1.2-2') }}
                </div>
                <div class="tooltip-ma-row" *ngIf="showMA50 && hoveredPoint.ma50">
                  <span class="ma-dot ma50-dot"></span> MA50: \${{ hoveredPoint.ma50 | number: (isForex ? '1.4-4' : '1.2-2') }}
                </div>
              </div>

              <svg
                class="analysis-svg"
                [attr.viewBox]="'0 0 ' + chartWidth + ' ' + chartHeight"
              >
                <defs>
                  <linearGradient id="tabGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.30" />
                    <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0" />
                  </linearGradient>
                </defs>

                <!-- Grid lines -->
                <g class="grid">
                  <line
                    *ngFor="let gridY of gridLinesY"
                    [attr.x1]="paddingLeft"
                    [attr.y1]="gridY.y"
                    [attr.x2]="chartWidth - paddingRight"
                    [attr.y2]="gridY.y"
                    stroke="#1e293b"
                    stroke-dasharray="2,2"
                    stroke-width="1"
                  />
                </g>

                <!-- Right Price Scale Axis Line -->
                <line
                  [attr.x1]="chartWidth - paddingRight"
                  [attr.y1]="paddingTop"
                  [attr.x2]="chartWidth - paddingRight"
                  [attr.y2]="chartHeight - paddingBottom"
                  stroke="#334155"
                  stroke-width="1"
                />

                <!-- Right Price Scale Labels & Ticks -->
                <g class="price-scale-ticks">
                  <g *ngFor="let gridY of gridLinesY">
                    <line
                      [attr.x1]="chartWidth - paddingRight"
                      [attr.y1]="gridY.y"
                      [attr.x2]="chartWidth - paddingRight + 5"
                      [attr.y2]="gridY.y"
                      stroke="#475569"
                      stroke-width="1"
                    />
                    <text
                      [attr.x]="chartWidth - paddingRight + 8"
                      [attr.y]="gridY.y + 4"
                      fill="#94a3b8"
                      font-size="11"
                      font-family="monospace"
                    >
                      {{ gridY.price | number:(isForex ? '1.4-4' : '1.2-2') }}
                    </text>
                  </g>
                </g>

                <!-- 1. Candlestick Mode (TradingView Color Scheme) -->
                <g *ngIf="chartType === 'candle'" class="candlestick-series">
                  <g *ngFor="let c of pricePoints" class="candle-item">
                    <!-- Wick (High to Low) -->
                    <line
                      [attr.x1]="c.x"
                      [attr.y1]="c.highY ?? c.y"
                      [attr.x2]="c.x"
                      [attr.y2]="c.lowY ?? c.y"
                      [attr.stroke]="c.isBullish ? '#089981' : '#f23645'"
                      [attr.stroke-width]="(c.width ?? 4) > 4 ? 1.5 : 1"
                    />
                    <!-- Body (Open to Close) -->
                    <rect
                      [attr.x]="c.x - (c.width ?? 4) / 2"
                      [attr.y]="c.bodyTop ?? c.y"
                      [attr.width]="c.width ?? 4"
                      [attr.height]="c.bodyHeight ?? 3"
                      [attr.fill]="c.isBullish ? '#089981' : '#f23645'"
                      [attr.stroke]="c.isBullish ? '#089981' : '#f23645'"
                      stroke-width="0.8"
                      rx="0.5"
                    />
                  </g>
                </g>

                <!-- 2. Line Mode -->
                <g *ngIf="chartType === 'line'">
                  <path [attr.d]="areaPathD" fill="url(#tabGrad)" />
                  <path [attr.d]="linePathD" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" />
                </g>

                <!-- MA20 Overlay -->
                <path
                  *ngIf="showMA20 && ma20PathD"
                  [attr.d]="ma20PathD"
                  fill="none"
                  stroke="#f59e0b"
                  stroke-width="1.8"
                  stroke-dasharray="4,2"
                />

                <!-- MA50 Overlay -->
                <path
                  *ngIf="showMA50 && ma50PathD"
                  [attr.d]="ma50PathD"
                  fill="none"
                  stroke="#a855f7"
                  stroke-width="1.8"
                  stroke-dasharray="2,2"
                />

                <!-- Current Price Horizontal Reference Line & Right Axis Tag -->
                <g *ngIf="currentPriceY !== null" class="current-price-reference">
                  <line
                    [attr.x1]="paddingLeft"
                    [attr.y1]="currentPriceY"
                    [attr.x2]="chartWidth - paddingRight"
                    [attr.y2]="currentPriceY"
                    [attr.stroke]="(liveQuote?.change ?? 0) >= 0 ? '#089981' : '#f23645'"
                    stroke-dasharray="3,3"
                    stroke-width="1.2"
                  />
                  <!-- Right Axis Price Badge -->
                  <rect
                    [attr.x]="chartWidth - paddingRight + 2"
                    [attr.y]="currentPriceY - 10"
                    width="70"
                    height="20"
                    rx="3"
                    [attr.fill]="(liveQuote?.change ?? 0) >= 0 ? '#089981' : '#f23645'"
                  />
                  <text
                    [attr.x]="chartWidth - paddingRight + 37"
                    [attr.y]="currentPriceY + 4"
                    fill="#ffffff"
                    font-size="11"
                    font-weight="800"
                    font-family="monospace"
                    text-anchor="middle"
                  >
                    {{ (liveQuote?.price ?? technicalData.currentPrice) | number:(isForex ? '1.4-4' : '1.2-2') }}
                  </text>
                  <!-- Orange LIVE Badge -->
                  <rect
                    [attr.x]="chartWidth - paddingRight + 2"
                    [attr.y]="currentPriceY - 26"
                    width="36"
                    height="13"
                    rx="2"
                    fill="#f59e0b"
                  />
                  <text
                    [attr.x]="chartWidth - paddingRight + 20"
                    [attr.y]="currentPriceY - 16"
                    fill="#040813"
                    font-size="8"
                    font-weight="900"
                    font-family="monospace"
                    text-anchor="middle"
                  >
                    LIVE
                  </text>
                </g>

                <!-- TradingView Watermark -->
                <text
                  [attr.x]="paddingLeft + 10"
                  [attr.y]="chartHeight - paddingBottom - 10"
                  fill="#334155"
                  font-size="11"
                  font-weight="700"
                  letter-spacing="0.05em"
                >
                  ⚡ TradingView
                </text>

                <!-- Full Hover Crosshair Lines -->
                <g *ngIf="hoveredPoint" class="crosshair-group">
                  <!-- Vertical Line -->
                  <line
                    [attr.x1]="hoveredPoint.x"
                    [attr.y1]="paddingTop"
                    [attr.x2]="hoveredPoint.x"
                    [attr.y2]="chartHeight - paddingBottom"
                    stroke="#38bdf8"
                    stroke-width="1"
                    stroke-dasharray="3,3"
                  />
                  <!-- Horizontal Line -->
                  <line
                    [attr.x1]="paddingLeft"
                    [attr.y1]="hoveredPoint.y"
                    [attr.x2]="chartWidth - paddingRight"
                    [attr.y2]="hoveredPoint.y"
                    stroke="#64748b"
                    stroke-width="1"
                    stroke-dasharray="2,2"
                  />
                  <!-- Glowing Snapped Circle Marker -->
                  <circle
                    [attr.cx]="hoveredPoint.x"
                    [attr.cy]="hoveredPoint.y"
                    r="5"
                    fill="#38bdf8"
                    stroke="#ffffff"
                    stroke-width="2"
                  />
                  <circle
                    [attr.cx]="hoveredPoint.x"
                    [attr.cy]="hoveredPoint.y"
                    r="10"
                    fill="#38bdf8"
                    fill-opacity="0.2"
                  />
                </g>
              </svg>

              <!-- Dynamic Multi-Year Date Axis Labels -->
              <div class="date-axis">
                <span *ngFor="let lbl of axisLabels">{{ lbl }}</span>
              </div>
            </div>

            <!-- Indicator Summary Tiles -->
            <div class="indicator-tiles">
              <div class="tile">
                <div class="tile-top">
                  <span class="tile-title">Moving Average 20</span>
                  <span class="badge" [ngClass]="getMaSignalClass(technicalData.currentPrice, technicalData.movingAverage20)">
                    {{ getMaSignal(technicalData.currentPrice, technicalData.movingAverage20) }}
                  </span>
                </div>
                <div class="tile-val">
                  {{ technicalData.movingAverage20 ? ('$' + (technicalData.movingAverage20 | number:'1.2-2')) : 'N/A' }}
                </div>
                <p class="tile-expl">20-session short-term trend line</p>
              </div>

              <div class="tile">
                <div class="tile-top">
                  <span class="tile-title">Moving Average 50</span>
                  <span class="badge" [ngClass]="getMaSignalClass(technicalData.currentPrice, technicalData.movingAverage50)">
                    {{ getMaSignal(technicalData.currentPrice, technicalData.movingAverage50) }}
                  </span>
                </div>
                <div class="tile-val">
                  {{ technicalData.movingAverage50 ? ('$' + (technicalData.movingAverage50 | number:'1.2-2')) : 'N/A' }}
                </div>
                <p class="tile-expl">50-session medium-term trend line</p>
              </div>

              <div class="tile">
                <div class="tile-top">
                  <span class="tile-title">RSI (14 Period)</span>
                  <span class="badge" [ngClass]="getRsiBadgeClass(technicalData.rsi14)">
                    {{ getRsiCondition(technicalData.rsi14) }}
                  </span>
                </div>
                <div class="tile-val">
                  {{ technicalData.rsi14 ? (technicalData.rsi14 | number:'1.2-2') : 'N/A' }}
                </div>
                <div class="rsi-bar">
                  <div class="zone zone-os"></div>
                  <div class="zone zone-neu"></div>
                  <div class="zone zone-ob"></div>
                  <div
                    *ngIf="technicalData.rsi14 !== null"
                    class="needle"
                    [style.left.%]="technicalData.rsi14"
                  ></div>
                </div>
                <div class="bar-labels">
                  <span>0</span>
                  <span>30</span>
                  <span>70</span>
                  <span>100</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Fundamentals Card -->
          <div class="card fundamentals-card">
            <div class="card-header">
              <div>
                <h3>Fundamental Overview</h3>
                <p class="card-sub">Valuation multiples and capital structure</p>
              </div>
            </div>

            <div class="fundamentals-grid">
              <div class="fund-box">
                <span class="fund-label">Market Capitalization</span>
                <span class="fund-val">\${{ formatMarketCap(fundamentalData.marketCap) }}</span>
                <span class="fund-hint">Total market equity value</span>
              </div>

              <div class="fund-box">
                <span class="fund-label">Earnings Per Share (EPS)</span>
                <span class="fund-val">\${{ fundamentalData.eps | number:'1.2-2' }}</span>
                <span class="fund-hint">Trailing 12-month net profit</span>
              </div>

              <div class="fund-box">
                <span class="fund-label">Price-to-Earnings (P/E)</span>
                <span class="fund-val">{{ fundamentalData.peRatio | number:'1.2-2' }}</span>
                <span class="fund-hint">Multiple of share price to earnings</span>
              </div>

              <div class="fund-box">
                <span class="fund-label">Sector</span>
                <span class="fund-val text-blue">{{ fundamentalData.sector }}</span>
                <span class="fund-hint">Industry grouping</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analysis-page {
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
    .view-tabs {
      display: flex;
      gap: 0.5rem;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 0.25rem;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tab-btn.active {
      background: #1e293b;
      color: #38bdf8;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
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
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .alert {
      padding: 1rem 1.25rem;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .alert-error {
      background-color: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #f87171;
    }
    .btn-retry {
      background: #ef4444;
      color: #ffffff;
      border: none;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
    }
    .analytics-content, .stock-analysis-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-title-row h2 {
      margin: 0;
      font-size: 1.25rem;
      color: #f8fafc;
    }
    .performance-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }
    .perf-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .card-label {
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .card-val {
      font-size: 1.75rem;
      font-weight: 800;
      color: #f8fafc;
    }
    .card-sub {
      color: #64748b;
      font-size: 0.75rem;
    }
    .pill-container {
      display: flex;
      align-items: center;
      margin: 0.15rem 0;
    }
    .badge-pill {
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
    .risk-indicators-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.25rem;
    }
    .risk-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .risk-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .risk-label {
      color: #94a3b8;
      font-size: 0.825rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .risk-main-stat {
      font-size: 1.35rem;
      font-weight: 800;
      color: #f8fafc;
    }
    .risk-description {
      color: #94a3b8;
      font-size: 0.85rem;
      line-height: 1.4;
      margin: 0;
    }
    .badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-weight: 700;
    }
    .badge-high-div {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .badge-mod-div {
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.4);
      color: #60a5fa;
    }
    .badge-low-div {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
    }
    .badge-high-risk {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
    }
    .badge-mod-risk {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
    }
    .badge-low-risk {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .disclaimer-banner {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.85rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .disclaimer-icon {
      color: #38bdf8;
      font-size: 1.25rem;
      font-weight: 700;
    }
    .disclaimer-text {
      color: #94a3b8;
      font-size: 0.8rem;
      line-height: 1.4;
    }
    .disclaimer-text strong {
      color: #e2e8f0;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 1.75rem 2rem;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .card-header h3 {
      margin: 0 0 0.25rem 0;
      font-size: 1.25rem;
      color: #f8fafc;
    }
    .card-sub {
      margin: 0;
      color: #94a3b8;
      font-size: 0.85rem;
    }
    .empty-allocation {
      text-align: center;
      padding: 3rem 1.5rem;
      color: #94a3b8;
    }
    .empty-icon {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
    }
    .empty-allocation h4 {
      color: #f8fafc;
      margin-bottom: 0.5rem;
    }
    .empty-allocation p {
      margin-bottom: 1.5rem;
    }
    .allocation-layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 2.5rem;
      align-items: center;
    }
    @media (max-width: 768px) {
      .allocation-layout {
        grid-template-columns: 1fr;
        justify-items: center;
      }
    }
    .donut-chart-wrapper {
      width: 280px;
      height: 280px;
    }
    .donut-svg {
      width: 100%;
      height: 100%;
    }
    .donut-center-title {
      fill: #64748b;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .donut-center-value {
      fill: #f8fafc;
      font-size: 1.4rem;
      font-weight: 800;
    }
    .allocation-list-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      width: 100%;
    }
    .stacked-bar {
      height: 14px;
      border-radius: 7px;
      overflow: hidden;
      display: flex;
      background: #1e293b;
    }
    .bar-segment {
      height: 100%;
      transition: width 0.3s ease;
    }
    .allocation-items-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .allocation-item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      background: #0b1120;
      border: 1px solid #1e293b;
    }
    .item-left {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    .color-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .item-symbol {
      color: #38bdf8;
      font-weight: 700;
      text-decoration: none;
      font-size: 0.95rem;
    }
    .item-symbol:hover {
      text-decoration: underline;
    }
    .item-company {
      color: #94a3b8;
      font-size: 0.8rem;
    }
    .item-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .item-value {
      color: #cbd5e1;
      font-size: 0.9rem;
    }
    .item-pct {
      color: #f8fafc;
      font-size: 0.95rem;
      min-width: 60px;
      text-align: right;
    }
    .font-bold { font-weight: 700; }
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
    .btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; }
    .selector-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }
    .selector-label {
      color: #94a3b8;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .stock-select {
      background: #0f172a;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      outline: none;
      cursor: pointer;
    }
    .overview-banner {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 1.75rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.5rem;
    }
    .badge-row {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 0.5rem;
      flex-wrap: wrap;
    }
    .symbol-pill {
      background: #1e293b;
      color: #38bdf8;
      border: 1px solid #334155;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 1.15rem;
      font-weight: 800;
    }
    .sector-pill {
      background-color: rgba(59, 130, 246, 0.1);
      color: #93c5fd;
      border: 1px solid rgba(59, 130, 246, 0.25);
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.8rem;
    }
    .rsi-pill {
      font-size: 0.8rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-weight: 700;
    }
    .overview-banner h2 {
      margin: 0;
      font-size: 1.85rem;
      color: #f8fafc;
    }
    .price-box {
      display: flex;
      flex-direction: column;
      text-align: right;
      gap: 0.25rem;
    }
    .price-title {
      color: #94a3b8;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .price-number {
      font-size: 2.2rem;
      font-weight: 800;
      color: #f8fafc;
    }
    .link-trade {
      color: #38bdf8;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .link-trade:hover { text-decoration: underline; }
    .chart-controls-wrapper {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      flex-wrap: wrap;
    }
    .chart-type-pills {
      display: flex;
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 0.2rem;
      gap: 0.2rem;
    }
    .type-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .type-btn:hover {
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.05);
    }
    .type-btn.active {
      background: #38bdf8;
      color: #0f172a;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
    }
    .timeframe-pills {
      display: flex;
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 0.2rem;
      gap: 0.2rem;
    }
    .tf-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tf-btn:hover {
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.05);
    }
    .tf-btn.active {
      background: #38bdf8;
      color: #0f172a;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
    }
    .chart-toggles { display: flex; gap: 1rem; }
    .toggle-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.85rem;
      color: #cbd5e1;
      cursor: pointer;
    }
    .legend-indicator {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }
    .ma20-ind { background: #f59e0b; }
    .ma50-ind { background: #a855f7; }
    .svg-container {
      position: relative;
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 1rem;
      overflow: hidden;
      cursor: crosshair;
    }
    .analysis-svg {
      width: 100%;
      height: 280px;
      display: block;
    }
    .chart-tooltip {
      position: absolute;
      transform: translate(-50%, -100%);
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(8px);
      border: 1px solid #38bdf8;
      padding: 0.5rem 0.85rem;
      border-radius: 8px;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      z-index: 20;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 0 15px rgba(56, 189, 248, 0.25);
      min-width: 130px;
      transition: left 0.05s ease-out, top 0.05s ease-out;
    }
    .tooltip-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      border-bottom: 1px solid #334155;
      padding-bottom: 0.25rem;
    }
    .tt-date { color: #94a3b8; font-size: 0.75rem; font-weight: 500; }
    .tooltip-pct { font-size: 0.75rem; font-weight: 700; }
    .tooltip-ohlc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.25rem 0.65rem;
      padding: 0.35rem 0;
      border-bottom: 1px solid #1e293b;
      margin-bottom: 0.25rem;
    }
    .ohlc-cell {
      display: flex;
      justify-content: space-between;
      gap: 0.4rem;
      font-size: 0.72rem;
    }
    .ohlc-lbl {
      color: #94a3b8;
      font-weight: 600;
    }
    .ohlc-val {
      color: #f8fafc;
      font-family: monospace;
      font-weight: 600;
    }
    .candlestick-series line, .candlestick-series rect {
      transition: opacity 0.15s ease;
    }
    .candle-item:hover rect {
      filter: brightness(1.3);
    }
    .tooltip-price-row { display: flex; align-items: baseline; }
    .tt-price {
      color: #f8fafc;
      font-weight: 800;
      font-size: 1.1rem;
      letter-spacing: -0.02em;
    }
    .tooltip-ma-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      color: #cbd5e1;
    }
    .ma-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .ma20-dot { background-color: #f59e0b; }
    .ma50-dot { background-color: #a855f7; }
    .text-green { color: #34d399; }
    .text-red { color: #f87171; }
    .date-axis {
      display: flex;
      justify-content: space-between;
      color: #64748b;
      font-size: 0.75rem;
      padding: 0.5rem 0.5rem 0;
      font-weight: 500;
    }
    .indicator-tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
      margin-top: 1.5rem;
    }
    .tile {
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .tile-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .tile-title {
      font-size: 0.8rem;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .tile-val {
      font-size: 1.6rem;
      font-weight: 800;
      color: #f8fafc;
    }
    .tile-expl {
      color: #64748b;
      font-size: 0.8rem;
      margin: 0;
    }
    .badge-bullish {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .badge-bearish {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
    }
    .badge-neutral {
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.4);
      color: #60a5fa;
    }
    .rsi-bar {
      position: relative;
      height: 10px;
      border-radius: 5px;
      overflow: hidden;
      display: flex;
      background: #1e293b;
      margin-top: 0.25rem;
    }
    .zone { height: 100%; }
    .zone-os { width: 30%; background: rgba(16, 185, 129, 0.6); }
    .zone-neu { width: 40%; background: rgba(59, 130, 246, 0.5); }
    .zone-ob { width: 30%; background: rgba(239, 68, 68, 0.6); }
    .needle {
      position: absolute;
      top: -2px;
      bottom: -2px;
      width: 4px;
      background: #ffffff;
      border-radius: 2px;
      transform: translateX(-50%);
      box-shadow: 0 0 4px #000;
    }
    .bar-labels {
      display: flex;
      justify-content: space-between;
      color: #64748b;
      font-size: 0.7rem;
    }
    .fundamentals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }
    .fund-box {
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .fund-label {
      color: #94a3b8;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }
    .fund-val {
      font-size: 1.5rem;
      font-weight: 800;
      color: #f8fafc;
    }
    .text-blue { color: #38bdf8; }
    .fund-hint {
      color: #64748b;
      font-size: 0.75rem;
    }

    /* Universal Live Search Row */
    .analysis-search-bar-row {
      display: flex;
      gap: 1.25rem;
      align-items: flex-end;
      flex-wrap: wrap;
      margin-bottom: 1.5rem;
    }
    .global-search-container {
      flex: 1;
      min-width: 320px;
      position: relative;
    }
    .search-input-wrapper {
      display: flex;
      align-items: center;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 0.5rem 1rem;
      transition: all 0.2s;
    }
    .search-input-wrapper:focus-within {
      border-color: #38bdf8;
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
    }
    .search-icon {
      font-size: 1.1rem;
      margin-right: 0.65rem;
    }
    .global-search-input {
      flex: 1;
      background: transparent;
      border: none;
      color: #f8fafc;
      font-size: 0.95rem;
      outline: none;
    }
    .global-search-input::placeholder {
      color: #64748b;
    }
    .clear-search-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.9rem;
      padding: 0.2rem 0.4rem;
    }
    .search-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #334155;
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 0.5rem;
    }
    .search-dropdown-menu {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      background: #0b1120;
      border: 1px solid #334155;
      border-radius: 10px;
      box-shadow: 0 16px 36px rgba(0,0,0,0.6);
      z-index: 100;
      max-height: 380px;
      overflow-y: auto;
    }
    .dropdown-header {
      display: flex;
      justify-content: space-between;
      padding: 0.6rem 1rem;
      background: #070d18;
      border-bottom: 1px solid #1e293b;
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
    }
    .dropdown-hint {
      color: #38bdf8;
      font-weight: 500;
      text-transform: none;
    }
    .search-result-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #1e293b;
      cursor: pointer;
      transition: background 0.15s;
    }
    .search-result-item:hover {
      background: #1e293b;
    }
    .search-result-item:last-child {
      border-bottom: none;
    }
    .res-left {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .res-symbol {
      font-weight: 700;
      color: #f8fafc;
      font-size: 0.95rem;
    }
    .res-name {
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .res-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.2rem;
    }
    .res-tag {
      font-size: 0.7rem;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      background: #1e293b;
      color: #94a3b8;
      font-weight: 600;
    }
    .res-tag.forex-tag {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .res-ex {
      font-size: 0.7rem;
      color: #64748b;
    }
    .quick-select-box {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: 220px;
    }
    .selector-label {
      font-size: 0.8rem;
      color: #94a3b8;
      font-weight: 600;
    }
    .stock-select {
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.55rem 0.85rem;
      font-size: 0.9rem;
      outline: none;
    }

    /* TradingView HUD & Header */
    .tv-header-line {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 0.85rem 1.25rem;
      background: #070d18;
      border-bottom: 1px solid #1e293b;
    }
    .tv-hud-left {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .tv-hud-title-line {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .tv-symbol-bold {
      font-size: 1.15rem;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: 0.02em;
    }
    .tv-dot {
      color: #475569;
      font-weight: 700;
    }
    .tv-tf-pill {
      font-size: 0.75rem;
      background: #1e293b;
      color: #38bdf8;
      padding: 0.1rem 0.45rem;
      border-radius: 4px;
      font-weight: 700;
    }
    .tv-live-source {
      font-size: 0.75rem;
      color: #10b981;
      font-weight: 600;
    }
    .tv-ohlc-readout {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      font-size: 0.8rem;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      flex-wrap: wrap;
    }
    .hud-pair {
      display: inline-flex;
      align-items: baseline;
      gap: 0.25rem;
    }
    .hud-k {
      color: #64748b;
      font-weight: 700;
    }
    .hud-v {
      color: #e2e8f0;
      font-weight: 600;
    }
    .chart-controls-wrapper {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      flex-wrap: wrap;
    }
    .chart-type-pills, .timeframe-pills {
      display: flex;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 6px;
      padding: 2px;
      gap: 2px;
    }
    .type-btn, .tf-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 0.35rem 0.65rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s;
    }
    .chart-svg-icon {
      flex-shrink: 0;
    }
    .type-btn:hover, .tf-btn:hover {
      color: #f8fafc;
    }
    .type-btn.active, .tf-btn.active {
      background: #38bdf8;
      color: #040813;
      font-weight: 700;
    }
    .chart-toggles {
      display: flex;
      gap: 0.75rem;
    }
    .toggle-item {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: #94a3b8;
      cursor: pointer;
    }
    .legend-indicator {
      width: 10px;
      height: 3px;
      border-radius: 2px;
    }
    .ma20-ind { background: #f59e0b; }
    .ma50-ind { background: #a855f7; }

    .tv-svg-container {
      position: relative;
      background: #040813;
      width: 100%;
    }
    .analysis-svg {
      width: 100%;
      height: 340px;
      display: block;
    }
    .price-scale-ticks text {
      user-select: none;
    }
    .candlestick-series .candle-item:hover rect {
      filter: brightness(1.25);
    }
    .tooltip-ohlc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.3rem 0.8rem;
      margin-top: 0.4rem;
      font-family: monospace;
      font-size: 0.8rem;
    }
    .ohlc-cell {
      display: flex;
      justify-content: space-between;
      gap: 0.4rem;
    }
    .ohlc-lbl {
      color: #94a3b8;
    }
    .ohlc-val {
      color: #f8fafc;
    }
  `]
})
export class AnalysisComponent implements OnInit, OnDestroy {
  activeTab: 'portfolio' | 'stock' = 'portfolio';

  // Portfolio Analytics State
  analytics: PortfolioAnalytics | null = null;
  isLoadingAnalytics = true;
  analyticsError = '';
  donutSegments: DonutSegment[] = [];

  // Stock Analysis State
  availableStocks: StockResponse[] = [];
  selectedSymbol = 'AAPL';
  isLoadingStocks = true;
  isLoadingStockAnalysis = true;
  stockError = '';

  technicalData: TechnicalAnalysis | null = null;
  fundamentalData: FundamentalAnalysis | null = null;

  // Live Global Search State
  searchQuery = '';
  searchResults: any[] = [];
  isSearching = false;
  showSearchDropdown = false;
  private searchDebounceTimer: any = null;

  // Chart properties
  chartType: 'candle' | 'line' = 'candle';
  chartWidth = 800;
  chartHeight = 340;
  paddingTop = 20;
  paddingBottom = 30;
  paddingLeft = 20;
  paddingRight = 75;
  currentPriceY: number | null = null;

  pricePoints: ChartPoint[] = [];
  gridLinesY: { y: number; price: number }[] = [];
  linePathD = '';
  areaPathD = '';
  ma20PathD = '';
  ma50PathD = '';

  showMA20 = true;
  showMA50 = true;

  timeframes: ('1M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL')[] = ['1M', '6M', '1Y', '3Y', '5Y', 'ALL'];
  selectedTimeframe: '1M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL' = '5Y';
  axisLabels: string[] = [];
  tooltipX = 0;
  tooltipY = 20;

  hoveredPoint: ChartPoint | null = null;

  firstDate = '';
  midDate = '';
  lastDate = '';

  private readonly colors = [
    '#38bdf8', '#10b981', '#f59e0b', '#a855f7',
    '#ec4899', '#6366f1', '#14b8a6', '#f97316'
  ];

  liveQuote: MarketQuote | null = null;
  private liveSubscription: Subscription | null = null;

  constructor(
    private portfolioService: PortfolioService,
    private analysisService: AnalysisService,
    private marketService: MarketService,
    private marketDataService: MarketDataService
  ) {}

  get isForex(): boolean {
    return (this.selectedSymbol || '').includes('/');
  }

  get currentOHLC(): { open: number; high: number; low: number; close: number; change: number; changePercent: number } | null {
    if (this.hoveredPoint) {
      const open = this.hoveredPoint.open ?? this.hoveredPoint.price;
      const high = this.hoveredPoint.high ?? this.hoveredPoint.price;
      const low = this.hoveredPoint.low ?? this.hoveredPoint.price;
      const close = this.hoveredPoint.close ?? this.hoveredPoint.price;
      const change = close - open;
      const changePercent = open > 0 ? (change / open) * 100 : 0;
      return { open, high, low, close, change, changePercent };
    }
    if (this.pricePoints && this.pricePoints.length > 0) {
      const last = this.pricePoints[this.pricePoints.length - 1];
      const open = last.open ?? last.price;
      const high = last.high ?? last.price;
      const low = last.low ?? last.price;
      const close = this.liveQuote?.price ?? (last.close ?? last.price);
      const change = this.liveQuote?.change ?? (close - open);
      const changePercent = this.liveQuote?.changePercent ?? (open > 0 ? (change / open) * 100 : 0);
      return { open, high, low, close, change, changePercent };
    }
    return null;
  }

  setChartType(type: 'candle' | 'line'): void {
    this.chartType = type;
  }

  onSearchInput(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    const q = this.searchQuery.trim();
    if (!q || q.length < 1) {
      this.searchResults = [];
      this.showSearchDropdown = false;
      this.isSearching = false;
      return;
    }

    this.isSearching = true;
    this.searchDebounceTimer = setTimeout(() => {
      this.marketDataService.search(q).subscribe({
        next: (res) => {
          this.isSearching = false;
          this.searchResults = res || [];
          this.showSearchDropdown = this.searchResults.length > 0;
        },
        error: () => {
          this.isSearching = false;
          this.searchResults = [];
        }
      });
    }, 280);
  }

  onSearchEnter(): void {
    const q = this.searchQuery.trim().toUpperCase();
    if (!q) return;
    this.showSearchDropdown = false;
    this.selectedSymbol = q;
    this.loadStockAnalysis(q);
  }

  selectSearchResult(res: any): void {
    if (!res || !res.symbol) return;
    this.searchQuery = res.symbol;
    this.showSearchDropdown = false;
    this.selectedSymbol = res.symbol;
    this.loadStockAnalysis(res.symbol);
  }

  ngOnInit(): void {
    this.loadPortfolioAnalytics();
    this.loadAvailableStocks();

    // Live continuous polling every 8s
    this.liveSubscription = interval(8000).subscribe(() => {
      if (this.activeTab === 'stock' && this.selectedSymbol && !this.isLoadingStockAnalysis) {
        this.marketDataService.getQuote(this.selectedSymbol).subscribe({
          next: (quote) => {
            this.liveQuote = quote;
            if (this.technicalData) {
              this.buildChartPaths();
            }
          },
          error: () => {}
        });
      } else if (this.activeTab === 'portfolio' && !this.isLoadingAnalytics) {
        this.portfolioService.getAnalytics().subscribe({
          next: (data) => {
            this.analytics = data;
            this.buildDonutSegments(data.allocation);
          },
          error: () => {}
        });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.liveSubscription) {
      this.liveSubscription.unsubscribe();
      this.liveSubscription = null;
    }
  }

  setTimeframe(tf: '1M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL' | string): void {
    this.selectedTimeframe = tf as any;
    this.buildChartPaths();
  }

  loadPortfolioAnalytics(): void {
    this.isLoadingAnalytics = true;
    this.analyticsError = '';

    this.portfolioService.getAnalytics().subscribe({
      next: (data) => {
        this.analytics = data;
        this.isLoadingAnalytics = false;
        this.buildDonutSegments(data.allocation);
      },
      error: (err) => {
        this.isLoadingAnalytics = false;
        this.analyticsError = err?.error?.message || 'Failed to load portfolio analytics';
      }
    });
  }

  buildDonutSegments(allocation: AllocationItem[]): void {
    this.donutSegments = [];
    if (!allocation || allocation.length === 0) return;

    // Circumference = 2 * PI * 80 ≈ 502.65
    const circumference = 2 * Math.PI * 80;
    let cumulative = 0;

    this.donutSegments = allocation.map((item, index) => {
      const segLength = (item.percentage / 100) * circumference;
      const dashArray = `${segLength.toFixed(2)} ${(circumference - segLength).toFixed(2)}`;
      const dashOffset = -((cumulative / 100) * circumference);
      cumulative += item.percentage;

      return {
        symbol: item.symbol,
        percentage: item.percentage,
        color: this.getAllocationColor(index),
        dashArray,
        dashOffset
      };
    });
  }

  getAllocationColor(index: number): string {
    return this.colors[index % this.colors.length];
  }

  getDiversificationClass(div: string): string {
    if (div === 'Higher Diversification') return 'badge-high-div';
    if (div === 'Moderate Diversification') return 'badge-mod-div';
    return 'badge-low-div';
  }

  getDiversificationDescription(div: string): string {
    if (div === 'Higher Diversification') {
      return 'Broad exposure across 4 or more holdings spreads individual asset volatility.';
    }
    if (div === 'Moderate Diversification') {
      return 'Portfolio is split across 2–3 holdings with moderate asset spread.';
    }
    if (div === 'Low Diversification') {
      return 'Capital is concentrated in a single holding, making portfolio returns sensitive to one asset.';
    }
    return 'No active holdings currently in portfolio.';
  }

  getRiskIndicatorClass(risk: string): string {
    if (risk === 'Lower Concentration') return 'badge-low-risk';
    if (risk === 'Moderate Concentration') return 'badge-mod-risk';
    return 'badge-high-risk';
  }

  getRiskSummary(risk: string): string {
    if (risk === 'Lower Concentration') return 'Low Single-Asset Exposure';
    if (risk === 'Moderate Concentration') return 'Moderate Single-Asset Exposure';
    if (risk === 'High Concentration') return 'High Single-Asset Exposure';
    return 'No Exposure';
  }

  getRiskDescription(risk: string): string {
    if (risk === 'Lower Concentration') {
      return 'No single holding dominates the portfolio excessively.';
    }
    if (risk === 'Moderate Concentration') {
      return 'Holdings are shared between a few companies. Consider expanding sectors.';
    }
    if (risk === 'High Concentration') {
      return '100% of invested capital is exposed to a single security.';
    }
    return 'Zero holdings currently active.';
  }

  loadAvailableStocks(): void {
    this.isLoadingStocks = true;
    this.marketService.getStocks().subscribe({
      next: (stocks) => {
        this.availableStocks = stocks;
        this.isLoadingStocks = false;
        if (stocks.length > 0) {
          const hasSelected = stocks.some(s => s.symbol === this.selectedSymbol);
          if (!hasSelected) {
            this.selectedSymbol = stocks[0].symbol;
          }
        }
        this.loadStockAnalysis(this.selectedSymbol);
      },
      error: () => {
        this.isLoadingStocks = false;
        this.loadStockAnalysis(this.selectedSymbol);
      }
    });
  }

  onSymbolChange(): void {
    this.loadStockAnalysis(this.selectedSymbol);
  }

  loadStockAnalysis(symbol: string): void {
    this.isLoadingStockAnalysis = true;
    this.stockError = '';
    this.liveQuote = null;

    // 1. Fetch live market quote
    this.marketDataService.getQuote(symbol).subscribe({
      next: (quote) => {
        this.liveQuote = quote;
        if (this.technicalData) {
          this.buildChartPaths();
        }
      },
      error: () => {}
    });

    // 2. Fetch technical analysis
    this.analysisService.getTechnicalAnalysis(symbol).subscribe({
      next: (tech) => {
        this.technicalData = tech;
        this.buildChartPaths();

        this.analysisService.getFundamentalAnalysis(symbol).subscribe({
          next: (fund) => {
            this.fundamentalData = fund;
            this.isLoadingStockAnalysis = false;
          },
          error: (err) => {
            this.isLoadingStockAnalysis = false;
            this.stockError = err?.error?.message || 'Failed to load fundamental metrics';
          }
        });
      },
      error: (err) => {
        this.isLoadingStockAnalysis = false;
        this.stockError = err?.error?.message || `Failed to load technical analysis for ${symbol}`;
      }
    });
  }

  buildChartPaths(): void {
    if (!this.technicalData || !this.technicalData.priceHistory || this.technicalData.priceHistory.length === 0) {
      return;
    }

    let fullHistory = this.technicalData.priceHistory.map(h => ({ ...h }));
    if (this.liveQuote && this.liveQuote.price) {
      const todayStr = this.liveQuote.timestamp
        ? new Date(this.liveQuote.timestamp).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const lastIndex = fullHistory.length - 1;
      if (lastIndex >= 0) {
        if (fullHistory[lastIndex].date === todayStr) {
          fullHistory[lastIndex].closePrice = this.liveQuote.price;
        } else {
          fullHistory.push({ date: todayStr, closePrice: this.liveQuote.price });
        }
      }
    }

    // Filter by selected timeframe
    let history = fullHistory;
    const count = history.length;
    if (this.selectedTimeframe === '1M') {
      history = history.slice(Math.max(0, count - 22));
    } else if (this.selectedTimeframe === '6M') {
      history = history.slice(Math.max(0, count - 126));
    } else if (this.selectedTimeframe === '1Y') {
      history = history.slice(Math.max(0, count - 252));
    } else if (this.selectedTimeframe === '3Y') {
      history = history.slice(Math.max(0, count - 756));
    }

    const n = history.length;
    if (n === 0) return;

    this.firstDate = history[0].date;
    this.midDate = history[Math.floor(n / 2)].date;
    this.lastDate = history[n - 1].date;

    // Generate 5 evenly spaced axis labels
    this.axisLabels = [];
    const labelSteps = Math.min(5, n);
    for (let i = 0; i < labelSteps; i++) {
      const idx = Math.floor((i / (labelSteps - 1)) * (n - 1));
      this.axisLabels.push(history[idx].date);
    }

    const startPrice = history[0].closePrice;

    // Precalculate MA values across the displayed slice
    const ma20Map: (number | undefined)[] = [];
    const ma50Map: (number | undefined)[] = [];
    for (let i = 0; i < n; i++) {
      if (i >= 19) {
        let s20 = 0;
        for (let j = i - 19; j <= i; j++) s20 += history[j].closePrice;
        ma20Map.push(s20 / 20);
      } else {
        ma20Map.push(undefined);
      }

      if (i >= 49) {
        let s50 = 0;
        for (let j = i - 49; j <= i; j++) s50 += history[j].closePrice;
        ma50Map.push(s50 / 50);
      } else {
        ma50Map.push(undefined);
      }
    }

    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (const item of history) {
      if (item.closePrice < minPrice) minPrice = item.closePrice;
      if (item.closePrice > maxPrice) maxPrice = item.closePrice;
    }

    if (minPrice === maxPrice) {
      minPrice -= 1;
      maxPrice += 1;
    }

    const priceBuffer = (maxPrice - minPrice) * 0.05;
    const effectiveMin = minPrice - priceBuffer;
    const effectiveMax = maxPrice + priceBuffer;
    const priceRange = effectiveMax - effectiveMin;

    const plotWidth = this.chartWidth - this.paddingLeft - this.paddingRight;
    const plotHeight = this.chartHeight - this.paddingTop - this.paddingBottom;

    // Calculate dynamic candle width based on number of points
    const candleWidth = Math.max(1.5, Math.min(16, (plotWidth / Math.max(1, n)) * 0.7));

    // Calculate chart points with full OHLC geometry
    this.pricePoints = history.map((item, index) => {
      const x = this.paddingLeft + (index / Math.max(1, n - 1)) * plotWidth;
      const y = this.chartHeight - this.paddingBottom - ((item.closePrice - effectiveMin) / priceRange) * plotHeight;
      const changeFromStart = ((item.closePrice - startPrice) / startPrice) * 100;

      const openVal = item.openPrice ?? item.closePrice;
      const highVal = item.highPrice ?? Math.max(openVal, item.closePrice);
      const lowVal = item.lowPrice ?? Math.min(openVal, item.closePrice);
      const closeVal = item.closePrice;

      const highY = this.chartHeight - this.paddingBottom - ((highVal - effectiveMin) / priceRange) * plotHeight;
      const lowY = this.chartHeight - this.paddingBottom - ((lowVal - effectiveMin) / priceRange) * plotHeight;
      const openY = this.chartHeight - this.paddingBottom - ((openVal - effectiveMin) / priceRange) * plotHeight;
      const closeY = y;

      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(closeY - openY));
      const isBullish = closeVal >= openVal;

      return {
        x,
        y,
        date: item.date,
        price: item.closePrice,
        open: openVal,
        high: highVal,
        low: lowVal,
        close: closeVal,
        highY,
        lowY,
        bodyTop,
        bodyHeight,
        width: candleWidth,
        isBullish,
        changeFromStart,
        ma20: ma20Map[index],
        ma50: ma50Map[index]
      };
    });

    // Create Line Path & Area Path
    let lineD = '';
    this.pricePoints.forEach((pt, i) => {
      lineD += (i === 0 ? 'M ' : ' L ') + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1);
    });
    this.linePathD = lineD;

    const bottomY = this.chartHeight - this.paddingBottom;
    const firstX = this.pricePoints[0].x.toFixed(1);
    const lastX = this.pricePoints[this.pricePoints.length - 1].x.toFixed(1);
    this.areaPathD = `${lineD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    // Horizontal Grid Lines
    this.gridLinesY = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const p = effectiveMin + (i / steps) * priceRange;
      const y = this.chartHeight - this.paddingBottom - (i / steps) * plotHeight;
      this.gridLinesY.push({ y, price: p });
    }

    // Build MA20 Path
    if (n >= 20) {
      let ma20D = '';
      for (let i = 19; i < n; i++) {
        const maVal = ma20Map[i]!;
        const x = this.pricePoints[i].x;
        const y = this.chartHeight - this.paddingBottom - ((maVal - effectiveMin) / priceRange) * plotHeight;
        ma20D += (i === 19 ? 'M ' : ' L ') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      this.ma20PathD = ma20D;
    } else {
      this.ma20PathD = '';
    }

    // Build MA50 Path
    if (n >= 50) {
      let ma50D = '';
      for (let i = 49; i < n; i++) {
        const maVal = ma50Map[i]!;
        const x = this.pricePoints[i].x;
        const y = this.chartHeight - this.paddingBottom - ((maVal - effectiveMin) / priceRange) * plotHeight;
        ma50D += (i === 49 ? 'M ' : ' L ') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      this.ma50PathD = ma50D;
    } else {
      this.ma50PathD = '';
    }

    // Current Price Y Reference Line
    const activePrice = this.liveQuote?.price ?? history[n - 1].closePrice;
    if (activePrice >= effectiveMin && activePrice <= effectiveMax) {
      this.currentPriceY = this.chartHeight - this.paddingBottom - ((activePrice - effectiveMin) / priceRange) * plotHeight;
    } else {
      this.currentPriceY = null;
    }
  }

  onChartMouseMove(event: MouseEvent): void {
    if (!this.pricePoints || this.pricePoints.length === 0) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const containerWidth = rect.width;

    // Convert mouseX to SVG coordinate space
    const chartX = (mouseX / containerWidth) * this.chartWidth;

    // Find nearest point
    let closest = this.pricePoints[0];
    let minDiff = Math.abs(this.pricePoints[0].x - chartX);
    for (let i = 1; i < this.pricePoints.length; i++) {
      const diff = Math.abs(this.pricePoints[i].x - chartX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = this.pricePoints[i];
      }
    }

    this.hoveredPoint = closest;

    // Position tooltip in pixel coordinates inside the container
    const pixelX = (closest.x / this.chartWidth) * containerWidth;
    const pixelY = (closest.y / this.chartHeight) * rect.height;

    this.tooltipX = Math.max(90, Math.min(containerWidth - 90, pixelX));
    this.tooltipY = Math.max(25, pixelY - 15);
  }

  getMaSignal(currentPrice: number, ma: number | null): string {
    if (ma === null || !currentPrice) return 'Neutral';
    return currentPrice >= ma ? 'Bullish' : 'Bearish';
  }

  getMaSignalClass(currentPrice: number, ma: number | null): string {
    if (ma === null || !currentPrice) return 'badge-neutral';
    return currentPrice >= ma ? 'badge-bullish' : 'badge-bearish';
  }

  getRsiCondition(rsi: number | null | undefined): string {
    if (rsi === null || rsi === undefined) return 'Neutral';
    if (rsi >= 70) return 'Overbought';
    if (rsi <= 30) return 'Oversold';
    return 'Neutral';
  }

  getRsiBadgeClass(rsi: number | null | undefined): string {
    if (rsi === null || rsi === undefined) return 'badge-neutral';
    if (rsi >= 70) return 'badge-bearish';
    if (rsi <= 30) return 'badge-bullish';
    return 'badge-neutral';
  }

  formatMarketCap(cap: number): string {
    if (!cap) return 'N/A';
    if (cap >= 1e12) {
      return (cap / 1e12).toFixed(2) + ' Trillion';
    }
    if (cap >= 1e9) {
      return (cap / 1e9).toFixed(2) + ' Billion';
    }
    return cap.toLocaleString();
  }
}
