import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MarketService } from '../../../core/services/market.service';
import { MarketDataService } from '../../../core/services/market-data.service';
import { WatchlistService } from '../../../core/services/watchlist.service';
import { AnalysisService } from '../../../core/services/analysis.service';
import { TradeService } from '../../../core/services/trade.service';
import { StockDetail } from '../../../models/stock.model';
import { MarketQuote, MarketSearchResult } from '../../../models/market-quote.model';
import { TechnicalAnalysis, FundamentalAnalysis, PriceHistoryItem } from '../../../models/analysis.model';
import { TradeFormComponent } from '../../trading/trade-form/trade-form.component';
import { OrderRequest, OrderResponse } from '../../../models/order.model';

export interface LiveTrade {
  id: string;
  time: string;
  type: 'BUY' | 'SELL';
  price: number;
  size: number;
  total: number;
  trader: string;
  isUserOrder?: boolean;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
  depthPercent: number;
}

interface ChartPoint {
  x: number;
  y: number;
  date: string;
  timeLabel?: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  openY?: number;
  highY?: number;
  lowY?: number;
  closeY?: number;
  bodyTop?: number;
  bodyHeight?: number;
  width?: number;
  isBullish?: boolean;
  changeFromStart?: number;
  ma20?: number;
  ma50?: number;
}

interface TimeframeOption {
  id: string;
  label: string;
  type: 'second' | 'minute' | 'day' | 'month' | 'year' | 'all';
  seconds: number;
}

@Component({
  selector: 'app-stock-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TradeFormComponent],
  template: `
    <div class="stock-details-page">
      <!-- Universal Live Search & Navigation Header -->
      <div class="top-search-header">
        <div class="header-nav-left">
          <a routerLink="/market" class="back-link">← Market Directory</a>
          <span class="nav-divider">/</span>
          <span class="current-symbol-crumb">{{ symbol }}</span>
        </div>

        <!-- Universal Global Live Search Bar -->
        <div class="global-search-container">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearchInput()"
              (keydown.enter)="onSearchEnter()"
              (focus)="showSearchDropdown = searchResults.length > 0"
              placeholder="Search any company, stock, or forex pair worldwide (e.g. AAPL, EUR/USD, NVDA, BABA, TSLA)..."
              class="global-search-input"
            />
            <span *ngIf="isSearching" class="search-spinner"></span>
            <button *ngIf="searchQuery" class="clear-search-btn" (click)="searchQuery = ''; searchResults = []; showSearchDropdown = false">✕</button>
          </div>

          <!-- Dropdown Results -->
          <div *ngIf="showSearchDropdown && searchResults.length > 0" class="search-dropdown-menu">
            <div class="dropdown-header">
              <span>Matching Worldwide Assets ({{ searchResults.length }})</span>
              <span class="dropdown-hint">Press Enter to view</span>
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
      </div>

      <!-- Real-Time Trading Engine Control Bar -->
      <div class="live-engine-banner">
        <div class="engine-left">
          <button
            class="live-stream-toggle"
            [class.active]="isLiveStreaming"
            (click)="toggleLiveStreaming()"
            title="Toggle second-by-second live candlestick animation"
          >
            <span class="pulse-dot" [class.paused]="!isLiveStreaming"></span>
            <span>{{ isLiveStreaming ? '⚡ LIVE CANDLESTREAM: ACTIVE (1s Ticks)' : '⏸ STREAM PAUSED' }}</span>
          </button>

          <div class="speed-selector">
            <span class="ctrl-label">Tick Rate:</span>
            <button
              class="speed-btn"
              [class.active]="tickIntervalMs === 500"
              (click)="setTickSpeed(500)"
              title="500ms Ultra High Frequency"
            >⚡ 0.5s</button>
            <button
              class="speed-btn"
              [class.active]="tickIntervalMs === 1000"
              (click)="setTickSpeed(1000)"
              title="1s Real-Time Standard"
            >1.0s</button>
            <button
              class="speed-btn"
              [class.active]="tickIntervalMs === 2000"
              (click)="setTickSpeed(2000)"
              title="2s Relaxed Pace"
            >2.0s</button>
          </div>

          <div class="volatility-selector">
            <span class="ctrl-label">Volatility:</span>
            <button
              class="speed-btn"
              [class.active]="volatilityMultiplier === 1.0"
              (click)="volatilityMultiplier = 1.0"
            >Normal</button>
            <button
              class="speed-btn"
              [class.active]="volatilityMultiplier === 2.5"
              (click)="volatilityMultiplier = 2.5"
            >🔥 High Vol</button>
          </div>
        </div>

        <div class="engine-right">
          <button class="sound-toggle-btn" (click)="soundEnabled = !soundEnabled" [class.active]="soundEnabled">
            <span>{{ soundEnabled ? '🔊 Audio: ON' : '🔈 Audio: OFF' }}</span>
          </button>
          <div class="trade-stats-badge">
            <span>Live Trades: <strong>{{ liveTradesCount }}</strong></span>
          </div>
        </div>
      </div>

      <!-- Main Loading State -->
      <div *ngIf="isLoading" class="state-card">
        <div class="spinner"></div>
        <p>Loading real-time company data & live candlesticks for {{ symbol }}...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage && !isLoading" class="alert alert-error">
        <span>{{ errorMessage }}</span>
        <button class="btn btn-sm btn-retry" (click)="reloadAll()">Retry</button>
      </div>

      <!-- Trade Notification Toast -->
      <div *ngIf="orderNotification" class="alert alert-success order-toast">
        <div class="toast-content">
          <span class="toast-icon">✓</span>
          <span>{{ orderNotification }}</span>
        </div>
        <button class="toast-close" (click)="orderNotification = ''">✕</button>
      </div>

      <div *ngIf="!isLoading && stock" class="stock-content">
        <!-- Stock Banner Card with Live Real-Time Tick Flashing -->
        <div class="stock-banner-card" [class.flash-up]="isPriceFlashingUp" [class.flash-down]="isPriceFlashingDown">
          <div class="stock-info">
            <div class="title-row">
              <span class="symbol-badge" [class.forex-badge]="isForex">{{ stock.symbol }}</span>
              <span class="sector-pill">{{ stock.sector }}</span>
              <span *ngIf="technicalData?.rsi14" class="rsi-mini-pill" [ngClass]="getRsiBadgeClass(technicalData?.rsi14)">
                RSI(14): {{ technicalData?.rsi14 | number:'1.2-2' }} ({{ getRsiCondition(technicalData?.rsi14) }})
              </span>
              <span class="live-stream-badge">
                <span class="pulse-dot"></span> LIVE AUTO-STREAM
              </span>
            </div>
            <h1 class="company-name">{{ stock.companyName }}</h1>
          </div>

          <div class="price-and-actions">
            <div class="price-display">
              <div *ngIf="liveQuote" class="live-quote-content">
                <div class="quote-header-line">
                  <span class="price-label">Real-Time Live Market Price</span>
                  <span
                    class="market-status-pill"
                    [ngClass]="liveQuote.marketStatus === 'OPEN' ? 'status-open' : 'status-closed'"
                  >
                    <span class="dot-indicator"></span> {{ liveQuote.marketStatus }}
                  </span>
                </div>

                <div class="quote-main-line">
                  <span class="price-value" [class.text-green]="lastTickDirection > 0" [class.text-red]="lastTickDirection < 0">
                    \${{ liveQuote.price | number:(isForex ? '1.4-4' : '1.2-2') }}
                  </span>
                  <span
                    class="quote-change-badge"
                    [ngClass]="liveQuote.change >= 0 ? 'badge-green' : 'badge-red'"
                  >
                    {{ liveQuote.change >= 0 ? '▲ +' : '▼ ' }}\${{ (liveQuote.change >= 0 ? liveQuote.change : -liveQuote.change) | number:(isForex ? '1.4-4' : '1.2-2') }}
                    ({{ liveQuote.changePercent | number:'1.2-2' }}%)
                  </span>
                </div>

                <div class="quote-sub-metrics">
                  <span class="sub-item">Bid: <strong class="text-green">\${{ currentBid | number:(isForex ? '1.4-4' : '1.2-2') }}</strong></span>
                  <span class="sub-divider">|</span>
                  <span class="sub-item">Ask: <strong class="text-red">\${{ currentAsk | number:(isForex ? '1.4-4' : '1.2-2') }}</strong></span>
                  <span class="sub-divider">|</span>
                  <span class="sub-item">Spread: \${{ (currentAsk - currentBid) | number:(isForex ? '1.4-4' : '1.2-2') }}</span>
                  <span class="sub-divider">|</span>
                  <span class="sub-item">Vol: {{ sessionVolume | number }}</span>
                </div>
              </div>

              <!-- Pending Fallback -->
              <div *ngIf="!liveQuote" class="price-pending">
                <span class="price-label">Market Price</span>
                <span class="price-value">\${{ stock.price | number:(isForex ? '1.4-4' : '1.2-2') }}</span>
              </div>
            </div>

            <div class="action-buttons">
              <button
                class="btn"
                [ngClass]="stock.inWatchlist ? 'btn-watchlist-active' : 'btn-watchlist-add'"
                [disabled]="isUpdatingWatchlist"
                (click)="toggleWatchlist()"
              >
                <span *ngIf="stock.inWatchlist">★ In Watchlist</span>
                <span *ngIf="!stock.inWatchlist">☆ Add to Watchlist</span>
              </button>

              <button class="btn btn-buy" (click)="openTrade('BUY')">
                Buy {{ stock.symbol }}
              </button>

              <button class="btn btn-sell" (click)="openTrade('SELL')">
                Sell {{ stock.symbol }}
              </button>
            </div>
          </div>
        </div>

        <!-- MAIN TRADING WORKBENCH (Chart + Live Order Book & Real-Time Tape) -->
        <div class="trading-workbench-grid">
          <!-- Left Column: TradingView Candlestick Chart with Live Second-by-Second Bar Stream -->
          <div class="workbench-main-col">
            <div class="section-card chart-section">
              <!-- TradingView Chart Header Bar with Live OHLC HUD & Next Bar Countdown -->
              <div class="tv-chart-top-bar">
                <div class="tv-asset-title-block">
                  <span class="tv-symbol-title">{{ stock.symbol }}</span>
                  <span class="tv-dot">·</span>
                  <span class="tv-timeframe-tag">{{ selectedTimeframe }} Real-Time</span>
                  <span class="tv-dot">·</span>
                  <span class="tv-exchange-tag">Live Stream</span>

                  <!-- Live TradingView OHLC Readout Bar -->
                  <div class="tv-ohlc-hud" *ngIf="currentOHLC">
                    <span class="hud-item"><span class="hud-lbl">O</span> <span class="hud-val">\${{ currentOHLC.open | number:(isForex ? '1.4-4' : '1.2-2') }}</span></span>
                    <span class="hud-item"><span class="hud-lbl">H</span> <span class="hud-val text-green">\${{ currentOHLC.high | number:(isForex ? '1.4-4' : '1.2-2') }}</span></span>
                    <span class="hud-item"><span class="hud-lbl">L</span> <span class="hud-val text-red">\${{ currentOHLC.low | number:(isForex ? '1.4-4' : '1.2-2') }}</span></span>
                    <span class="hud-item"><span class="hud-lbl">C</span> <span class="hud-val font-bold">\${{ currentOHLC.close | number:(isForex ? '1.4-4' : '1.2-2') }}</span></span>
                    <span class="hud-item" [ngClass]="currentOHLC.change >= 0 ? 'text-green' : 'text-red'">
                      {{ currentOHLC.change >= 0 ? '+' : '' }}\${{ currentOHLC.change | number:(isForex ? '1.4-4' : '1.2-2') }} ({{ currentOHLC.changePercent | number:'1.2-2' }}%)
                    </span>
                  </div>

                  <!-- Real-Time Bar Countdown Timer -->
                  <div class="bar-countdown-tag" *ngIf="isLiveStreaming">
                    <span class="countdown-clock">⏳ Next Bar: {{ barCountdownSec }}s</span>
                  </div>
                </div>

                <div class="chart-controls-wrapper">
                  <!-- Chart Type Selector -->
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
                      title="Line & Area View"
                    >
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" class="chart-svg-icon">
                        <path d="M2 12 L6 7 L10 9 L14 3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="14" cy="3" r="1.5" fill="#38bdf8"/>
                      </svg>
                      <span>Line</span>
                    </button>
                  </div>

                  <!-- Intraday & Multi-Period Timeframe Selector -->
                  <div class="timeframe-pills">
                    <button
                      *ngFor="let tf of timeframeOptions"
                      class="tf-btn"
                      [class.active]="selectedTimeframe === tf.id"
                      [class.live-tf]="tf.id === '1s' || tf.id === '5s' || tf.id === '1m'"
                      (click)="setTimeframe(tf.id)"
                    >
                      {{ tf.label }}
                    </button>
                  </div>

                  <div class="chart-toggles">
                    <label class="toggle-label toggle-ma20">
                      <input type="checkbox" [(ngModel)]="showMA20" (change)="buildChartPaths()" />
                      <span class="legend-color ma20-box"></span> MA20
                    </label>
                    <label class="toggle-label toggle-ma50">
                      <input type="checkbox" [(ngModel)]="showMA50" (change)="buildChartPaths()" />
                      <span class="legend-color ma50-box"></span> MA50
                    </label>
                  </div>
                </div>
              </div>

              <!-- Chart Loading -->
              <div *ngIf="isLoadingTechnical" class="chart-loading">
                <div class="micro-spinner"></div>
                <p>Rendering high-density live candlesticks...</p>
              </div>

              <!-- TradingView Interactive Candlestick SVG Container with Live Second-by-Second Movements -->
              <div
                *ngIf="!isLoadingTechnical && pricePoints.length > 0"
                class="tv-chart-wrapper"
                (mousemove)="onChartMouseMove($event)"
                (mouseleave)="hoveredPoint = null"
              >
                <!-- Hover Floating Tooltip -->
                <div
                  *ngIf="hoveredPoint"
                  class="tv-hover-tooltip"
                  [style.left.px]="tooltipX"
                  [style.top.px]="tooltipY"
                >
                  <div class="tooltip-header">
                    <span class="tooltip-date">{{ hoveredPoint.timeLabel || hoveredPoint.date }}</span>
                    <span
                      *ngIf="hoveredPoint.changeFromStart !== undefined"
                      class="tooltip-pct"
                      [ngClass]="hoveredPoint.changeFromStart >= 0 ? 'text-green' : 'text-red'"
                    >
                      {{ hoveredPoint.changeFromStart >= 0 ? '+' : '' }}{{ hoveredPoint.changeFromStart | number:'1.2-2' }}%
                    </span>
                  </div>

                  <!-- OHLC Readout Grid -->
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
                  class="tv-price-chart-svg"
                  [attr.viewBox]="'0 0 ' + chartWidth + ' ' + chartHeight"
                >
                  <defs>
                    <linearGradient id="tvPriceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.30" />
                      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0" />
                    </linearGradient>
                  </defs>

                  <!-- Grid reference lines -->
                  <g class="grid-lines">
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

                  <!-- Right Price Scale Axis Background & Border -->
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

                  <!-- 1. Candlestick Mode with Live Second-by-Second Bar Formation -->
                  <g *ngIf="chartType === 'candle'" class="candlestick-series">
                    <g *ngFor="let c of pricePoints; let isLast = last" class="candle-item">
                      <!-- Wick (High to Low) -->
                      <line
                        [attr.x1]="c.x"
                        [attr.y1]="c.highY ?? c.y"
                        [attr.x2]="c.x"
                        [attr.y2]="c.lowY ?? c.y"
                        [attr.stroke]="c.isBullish ? '#089981' : '#f23645'"
                        [attr.stroke-width]="(c.width ?? 6) > 5 ? 1.5 : 1"
                      />
                      <!-- Real Body (Open to Close) with active pulse on latest candle -->
                      <rect
                        [attr.x]="c.x - (c.width ?? 6) / 2"
                        [attr.y]="c.bodyTop ?? c.y"
                        [attr.width]="c.width ?? 6"
                        [attr.height]="c.bodyHeight ?? 3"
                        [attr.fill]="c.isBullish ? '#089981' : '#f23645'"
                        [attr.stroke]="c.isBullish ? '#089981' : '#f23645'"
                        stroke-width="0.8"
                        rx="0.5"
                        [class.active-candle-glow]="isLast && isLiveStreaming"
                      />
                    </g>
                  </g>

                  <!-- 2. Line / Area Mode with Moving Leading Edge Node -->
                  <g *ngIf="chartType === 'line'" class="line-series">
                    <path [attr.d]="areaPathD" fill="url(#tvPriceGradient)" />
                    <path [attr.d]="linePathD" fill="none" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
                    <!-- Animated Price Dot at tip -->
                    <circle
                      *ngIf="pricePoints.length > 0"
                      [attr.cx]="pricePoints[pricePoints.length - 1].x"
                      [attr.cy]="pricePoints[pricePoints.length - 1].y"
                      r="4.5"
                      fill="#38bdf8"
                      stroke="#ffffff"
                      stroke-width="2"
                    />
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

                  <!-- Current Price Horizontal Reference Line & Right-Axis Moving Price Badge -->
                  <g *ngIf="currentPriceY !== null" class="current-price-reference">
                    <!-- Dashed horizontal line following live price -->
                    <line
                      [attr.x1]="paddingLeft"
                      [attr.y1]="currentPriceY"
                      [attr.x2]="chartWidth - paddingRight"
                      [attr.y2]="currentPriceY"
                      [attr.stroke]="(liveQuote?.change ?? 0) >= 0 ? '#089981' : '#f23645'"
                      stroke-dasharray="3,3"
                      stroke-width="1.2"
                    />

                    <!-- Active Price Badge on Right Scale -->
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
                      {{ (liveQuote?.price ?? stock.price) | number:(isForex ? '1.4-4' : '1.2-2') }}
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
                    ⚡ TradingView Real-Time Engine
                  </text>

                  <!-- Full Hover Crosshair Lines & Marker -->
                  <g *ngIf="hoveredPoint" class="crosshair-group">
                    <line
                      [attr.x1]="hoveredPoint.x"
                      [attr.y1]="paddingTop"
                      [attr.x2]="hoveredPoint.x"
                      [attr.y2]="chartHeight - paddingBottom"
                      stroke="#38bdf8"
                      stroke-width="1"
                      stroke-dasharray="3,3"
                    />
                    <line
                      [attr.x1]="paddingLeft"
                      [attr.y1]="hoveredPoint.y"
                      [attr.x2]="chartWidth - paddingRight"
                      [attr.y2]="hoveredPoint.y"
                      stroke="#64748b"
                      stroke-width="1"
                      stroke-dasharray="2,2"
                    />
                    <circle
                      [attr.cx]="hoveredPoint.x"
                      [attr.cy]="hoveredPoint.y"
                      r="5"
                      fill="#38bdf8"
                      stroke="#ffffff"
                      stroke-width="2"
                    />
                  </g>
                </svg>

                <!-- Chart Dynamic X-Axis Timestamps (Hours:Minutes:Seconds in Live Mode) -->
                <div class="x-axis-labels">
                  <span *ngFor="let lbl of axisLabels">{{ lbl }}</span>
                </div>
              </div>

              <!-- 3 Technical Indicators Cards: MA20, MA50, RSI -->
              <div *ngIf="technicalData" class="indicators-grid">
                <!-- MA20 Card -->
                <div class="indicator-card">
                  <div class="indicator-header">
                    <span class="indicator-title">MA 20 (Moving Average)</span>
                    <span class="indicator-badge" [ngClass]="getMaSignalClass(liveQuote?.price ?? stock.price, technicalData.movingAverage20)">
                      {{ getMaSignal(liveQuote?.price ?? stock.price, technicalData.movingAverage20) }}
                    </span>
                  </div>
                  <div class="indicator-value">
                    {{ technicalData.movingAverage20 ? ('$' + (technicalData.movingAverage20 | number:(isForex ? '1.4-4' : '1.2-2'))) : 'N/A' }}
                  </div>
                  <div class="indicator-desc">
                    20-period short-term trend line.
                    <span *ngIf="technicalData.movingAverage20">
                      Price is {{ getPriceVsMaPercent(liveQuote?.price ?? stock.price, technicalData.movingAverage20) }} MA20.
                    </span>
                  </div>
                </div>

                <!-- MA50 Card -->
                <div class="indicator-card">
                  <div class="indicator-header">
                    <span class="indicator-title">MA 50 (Moving Average)</span>
                    <span class="indicator-badge" [ngClass]="getMaSignalClass(liveQuote?.price ?? stock.price, technicalData.movingAverage50)">
                      {{ getMaSignal(liveQuote?.price ?? stock.price, technicalData.movingAverage50) }}
                    </span>
                  </div>
                  <div class="indicator-value">
                    {{ technicalData.movingAverage50 ? ('$' + (technicalData.movingAverage50 | number:(isForex ? '1.4-4' : '1.2-2'))) : 'N/A' }}
                  </div>
                  <div class="indicator-desc">
                    50-period trend line.
                    <span *ngIf="technicalData.movingAverage50">
                      Price is {{ getPriceVsMaPercent(liveQuote?.price ?? stock.price, technicalData.movingAverage50) }} MA50.
                    </span>
                  </div>
                </div>

                <!-- RSI14 Card -->
                <div class="indicator-card">
                  <div class="indicator-header">
                    <span class="indicator-title">RSI 14 (Relative Strength)</span>
                    <span class="indicator-badge" [ngClass]="getRsiBadgeClass(technicalData.rsi14)">
                      {{ getRsiCondition(technicalData.rsi14) }}
                    </span>
                  </div>
                  <div class="indicator-value">
                    {{ technicalData.rsi14 ? (technicalData.rsi14 | number:'1.2-2') : 'N/A' }}
                  </div>
                  <!-- RSI Meter Progress Bar -->
                  <div class="rsi-meter-container">
                    <div class="rsi-meter-track">
                      <div class="rsi-zone zone-oversold" title="Oversold (<30)"></div>
                      <div class="rsi-zone zone-neutral" title="Neutral (30-70)"></div>
                      <div class="rsi-zone zone-overbought" title="Overbought (>70)"></div>
                      <div
                        *ngIf="technicalData.rsi14 !== null"
                        class="rsi-needle"
                        [style.left.%]="technicalData.rsi14"
                      ></div>
                    </div>
                    <div class="rsi-meter-labels">
                      <span>0 (Oversold)</span>
                      <span>30</span>
                      <span>70</span>
                      <span>100 (Overbought)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Live Order Book & Time & Sales Stream + 1-Click Live Trading -->
          <div class="workbench-side-col">
            <!-- 1-Click Fast Live Trading Box -->
            <div class="side-panel-card quick-trade-card">
              <div class="panel-header">
                <span class="panel-title">⚡ Instant 1-Click Trading</span>
                <span class="live-dot-tag"><span class="dot"></span> ACTIVE</span>
              </div>

              <div class="quick-trade-body">
                <div class="qty-selector-row">
                  <span class="qty-lbl">Shares / Lots:</span>
                  <div class="qty-pills">
                    <button class="qty-pill" [class.active]="quickTradeQty === 10" (click)="quickTradeQty = 10">10</button>
                    <button class="qty-pill" [class.active]="quickTradeQty === 50" (click)="quickTradeQty = 50">50</button>
                    <button class="qty-pill" [class.active]="quickTradeQty === 100" (click)="quickTradeQty = 100">100</button>
                    <button class="qty-pill" [class.active]="quickTradeQty === 500" (click)="quickTradeQty = 500">500</button>
                  </div>
                </div>

                <div class="qty-input-box">
                  <button class="stepper-btn" (click)="quickTradeQty = (quickTradeQty > 5 ? quickTradeQty - 5 : 1)">−</button>
                  <input type="number" [(ngModel)]="quickTradeQty" min="1" class="qty-input" />
                  <button class="stepper-btn" (click)="quickTradeQty = quickTradeQty + 5">+</button>
                </div>

                <div class="est-total-line">
                  <span>Est. Execution Value:</span>
                  <strong>\${{ (quickTradeQty * (liveQuote?.price ?? stock.price)) | number:'1.2-2' }}</strong>
                </div>

                <!-- Big Fast 1-Click BUY & SELL Action Buttons -->
                <div class="fast-action-buttons">
                  <button
                    class="fast-btn fast-buy-btn"
                    [disabled]="isExecutingQuickTrade"
                    (click)="execute1ClickTrade('BUY')"
                  >
                    <span class="fast-btn-title">BUY MARKET</span>
                    <span class="fast-btn-price">&#64; \${{ currentAsk | number:(isForex ? '1.4-4' : '1.2-2') }}</span>
                  </button>
                  <button
                    class="fast-btn fast-sell-btn"
                    [disabled]="isExecutingQuickTrade"
                    (click)="execute1ClickTrade('SELL')"
                  >
                    <span class="fast-btn-title">SELL MARKET</span>
                    <span class="fast-btn-price">&#64; \${{ currentBid | number:(isForex ? '1.4-4' : '1.2-2') }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Live Order Book (Depth of Market) -->
            <div class="side-panel-card orderbook-card">
              <div class="panel-header">
                <span class="panel-title">📊 Live Order Book (DOM)</span>
                <span class="market-status-mini">REAL-TIME DEPTH</span>
              </div>

              <div class="orderbook-table-container">
                <div class="ob-header-row">
                  <span>PRICE (\$)</span>
                  <span class="text-right">SIZE</span>
                  <span class="text-right">TOTAL</span>
                </div>

                <!-- Asks (Red) -->
                <div class="ob-asks-list">
                  <div *ngFor="let ask of orderBookAsks" class="ob-row ask-row">
                    <div class="depth-bar ask-depth" [style.width.%]="ask.depthPercent"></div>
                    <span class="ob-price text-red font-mono">\${{ ask.price | number:(isForex ? '1.4-4' : '1.2-2') }}</span>
                    <span class="ob-size text-right font-mono">{{ ask.size }}</span>
                    <span class="ob-total text-right font-mono">{{ ask.total }}</span>
                  </div>
                </div>

                <!-- Current Mid-Spread Banner -->
                <div class="ob-spread-banner" [class.spread-flash-up]="lastTickDirection > 0" [class.spread-flash-down]="lastTickDirection < 0">
                  <div class="spread-left">
                    <span class="spread-price font-mono font-bold">\${{ (liveQuote?.price ?? stock.price) | number:(isForex ? '1.4-4' : '1.2-2') }}</span>
                    <span class="spread-tick-arrow">{{ lastTickDirection >= 0 ? '▲' : '▼' }}</span>
                  </div>
                  <div class="spread-right">
                    <span>Spread: \${{ (currentAsk - currentBid) | number:(isForex ? '1.4-4' : '1.2-2') }}</span>
                  </div>
                </div>

                <!-- Bids (Green) -->
                <div class="ob-bids-list">
                  <div *ngFor="let bid of orderBookBids" class="ob-row bid-row">
                    <div class="depth-bar bid-depth" [style.width.%]="bid.depthPercent"></div>
                    <span class="ob-price text-green font-mono">\${{ bid.price | number:(isForex ? '1.4-4' : '1.2-2') }}</span>
                    <span class="ob-size text-right font-mono">{{ bid.size }}</span>
                    <span class="ob-total text-right font-mono">{{ bid.total }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Live Time & Sales Tape ("People Buying & Selling") -->
            <div class="side-panel-card tape-card">
              <div class="panel-header">
                <div class="panel-title-group">
                  <span class="panel-title">⚡ Live Executions Tape</span>
                  <span class="tape-badge">{{ liveTrades.length }} Recent Trades</span>
                </div>
                <div class="vol-ratio-box">
                  <span class="text-green">{{ buyVolumePct }}% B</span>
                  <div class="vol-ratio-track">
                    <div class="vol-ratio-buy" [style.width.%]="buyVolumePct"></div>
                  </div>
                  <span class="text-red">{{ 100 - buyVolumePct }}% S</span>
                </div>
              </div>

              <div class="tape-table-container">
                <div class="tape-header-row">
                  <span>TIME</span>
                  <span>SIDE</span>
                  <span class="text-right">PRICE</span>
                  <span class="text-right">SHARES</span>
                  <span class="text-right">FLOW / ROUTE</span>
                </div>

                <div class="tape-stream-rows">
                  <div
                    *ngFor="let trade of liveTrades"
                    class="tape-row"
                    [class.user-trade-row]="trade.isUserOrder"
                    [class.buy-trade]="trade.type === 'BUY'"
                    [class.sell-trade]="trade.type === 'SELL'"
                  >
                    <span class="tape-time font-mono">{{ trade.time }}</span>
                    <span
                      class="tape-side-pill"
                      [ngClass]="trade.type === 'BUY' ? 'side-buy' : 'side-sell'"
                    >
                      {{ trade.type }}
                    </span>
                    <span class="tape-price font-mono font-bold" [ngClass]="trade.type === 'BUY' ? 'text-green' : 'text-red'">
                      \${{ trade.price | number:(isForex ? '1.4-4' : '1.2-2') }}
                    </span>
                    <span class="tape-size font-mono text-right">{{ trade.size | number }}</span>
                    <span class="tape-trader text-right">
                      <span *ngIf="trade.isUserOrder" class="user-badge">👑 YOU</span>
                      <span *ngIf="!trade.isUserOrder">{{ trade.trader }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Fundamentals Section -->
        <div *ngIf="stock" class="section-card">
          <div class="section-header">
            <div>
              <h2>Fundamental Metrics & Valuation</h2>
              <p class="section-sub">Corporate enterprise valuation, balance sheet structure, and earnings profile</p>
            </div>
          </div>

          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-label">Market Capitalization</span>
              <span class="metric-value">{{ stock.marketCap ? ('$' + formatMarketCap(stock.marketCap)) : 'Global Liquid Market' }}</span>
              <span class="metric-sub">Total enterprise valuation</span>
            </div>

            <div class="metric-card">
              <span class="metric-label">Earnings Per Share (EPS)</span>
              <span class="metric-value">{{ stock.eps ? ('$' + (stock.eps | number:'1.2-2')) : 'N/A' }}</span>
              <span class="metric-sub">Diluted trailing 12 months</span>
            </div>

            <div class="metric-card">
              <span class="metric-label">Price-to-Earnings (P/E)</span>
              <span class="metric-value">{{ stock.peRatio ? (stock.peRatio | number:'1.2-2') : 'N/A' }}</span>
              <span class="metric-sub">Stock price relative to earnings</span>
            </div>

            <div class="metric-card">
              <span class="metric-label">Sector & Asset Class</span>
              <span class="metric-value sector-text">{{ stock.sector }}</span>
              <span class="metric-sub">Global classification</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Trade Form Modal Component -->
      <app-trade-form
        *ngIf="showTradeModal && stock"
        [stockId]="stock.id"
        [symbol]="stock.symbol"
        [companyName]="stock.companyName"
        [currentPrice]="liveQuote?.price ?? stock.price"
        [initialType]="tradeType"
        (close)="showTradeModal = false"
        (orderPlaced)="onOrderSuccess($event)"
      ></app-trade-form>
    </div>
  `,
  styles: [`
    .stock-details-page {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .top-search-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
      background: #0b1120;
      border: 1px solid #1e293b;
      padding: 0.75rem 1.25rem;
      border-radius: 12px;
    }
    .header-nav-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
    }
    .back-link {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 600;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    .nav-divider {
      color: #475569;
    }
    .current-symbol-crumb {
      color: #f8fafc;
      font-weight: 700;
    }
    .global-search-container {
      position: relative;
      flex: 1;
      max-width: 540px;
      min-width: 280px;
    }
    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 0.85rem;
      color: #64748b;
      pointer-events: none;
      font-size: 0.9rem;
    }
    .global-search-input {
      width: 100%;
      background: #0f172a;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 0.6rem 2.4rem 0.6rem 2.4rem;
      border-radius: 8px;
      font-size: 0.875rem;
      outline: none;
      transition: all 0.15s ease;
    }
    .global-search-input:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.25);
    }
    .search-spinner {
      position: absolute;
      right: 2.2rem;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(56, 189, 248, 0.2);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .clear-search-btn {
      position: absolute;
      right: 0.75rem;
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .search-dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 0.35rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.7);
      z-index: 50;
      max-height: 280px;
      overflow-y: auto;
    }
    .dropdown-header {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0.85rem;
      background: #1e293b;
      color: #94a3b8;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .search-result-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid #1e293b;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .search-result-item:hover {
      background: #1e293b;
    }
    .res-left {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .res-symbol {
      color: #38bdf8;
      font-weight: 800;
      font-size: 0.9rem;
    }
    .res-name {
      color: #cbd5e1;
      font-size: 0.8rem;
    }
    .res-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .res-tag {
      background: rgba(59, 130, 246, 0.15);
      color: #93c5fd;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }
    .forex-tag {
      background: rgba(168, 85, 247, 0.15);
      color: #c084fc;
    }
    .res-ex {
      color: #64748b;
      font-size: 0.72rem;
    }

    /* Live Engine Control Bar */
    .live-engine-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      background: #0d1527;
      border: 1px solid #2563eb40;
      padding: 0.5rem 1rem;
      border-radius: 10px;
    }
    .engine-left, .engine-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .live-stream-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .live-stream-toggle:hover {
      background: rgba(16, 185, 129, 0.25);
    }
    .live-stream-toggle.active {
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      animation: liveGlow 1.4s infinite;
    }
    .pulse-dot.paused {
      background: #94a3b8;
      animation: none;
    }
    @keyframes liveGlow {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.4); opacity: 0.5; }
    }
    .ctrl-label {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 600;
    }
    .speed-selector, .volatility-selector {
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .speed-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .speed-btn:hover {
      color: #f8fafc;
      background: #334155;
    }
    .speed-btn.active {
      background: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
    }
    .sound-toggle-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      cursor: pointer;
    }
    .sound-toggle-btn.active {
      color: #38bdf8;
      border-color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
    }
    .trade-stats-badge {
      font-size: 0.75rem;
      color: #94a3b8;
      background: #1e293b;
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      border: 1px solid #334155;
    }
    .trade-stats-badge strong {
      color: #38bdf8;
    }

    /* Stock Banner */
    .stock-banner-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.5rem;
      transition: background-color 0.25s ease, border-color 0.25s ease;
    }
    .stock-banner-card.flash-up {
      background: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.5);
    }
    .stock-banner-card.flash-down {
      background: rgba(239, 68, 68, 0.08);
      border-color: rgba(239, 68, 68, 0.5);
    }
    .stock-info {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .symbol-badge {
      font-size: 1.1rem;
      font-weight: 900;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      letter-spacing: 0.05em;
    }
    .symbol-badge.forex-badge {
      color: #c084fc;
      background: rgba(192, 132, 252, 0.15);
    }
    .sector-pill {
      font-size: 0.75rem;
      color: #94a3b8;
      background: #1e293b;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .rsi-mini-pill {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }
    .live-stream-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .company-name {
      font-size: 1.5rem;
      color: #f8fafc;
      margin: 0;
      font-weight: 800;
    }
    .price-and-actions {
      display: flex;
      align-items: center;
      gap: 2rem;
      flex-wrap: wrap;
    }
    .price-display {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .quote-header-line {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .price-label {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 600;
    }
    .market-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .status-open {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
    }
    .status-closed {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
    .dot-indicator {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }
    .quote-main-line {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
    }
    .price-value {
      font-size: 2rem;
      font-weight: 900;
      color: #f8fafc;
      letter-spacing: -0.02em;
      transition: color 0.15s ease;
    }
    .quote-change-badge {
      font-size: 0.875rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
    }
    .badge-green {
      background: rgba(16, 185, 129, 0.18);
      color: #34d399;
    }
    .badge-red {
      background: rgba(239, 68, 68, 0.18);
      color: #f87171;
    }
    .quote-sub-metrics {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 0.15rem;
    }
    .sub-divider {
      color: #475569;
    }
    .action-buttons {
      display: flex;
      gap: 0.6rem;
      align-items: center;
      flex-wrap: wrap;
    }

    /* Main Trading Workbench Grid */
    .trading-workbench-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 1.25rem;
      align-items: start;
    }
    @media (max-width: 1200px) {
      .trading-workbench-grid {
        grid-template-columns: 1fr;
      }
    }
    .workbench-main-col {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .workbench-side-col {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* Side Panel Cards */
    .side-panel-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 0.5rem;
    }
    .panel-title {
      font-size: 0.85rem;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: 0.02em;
    }
    .panel-title-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .tape-badge {
      font-size: 0.68rem;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
    }
    .live-dot-tag {
      font-size: 0.65rem;
      font-weight: 800;
      color: #34d399;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .live-dot-tag .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
    }
    .market-status-mini {
      font-size: 0.65rem;
      font-weight: 800;
      color: #64748b;
    }

    /* Quick Trade Action Box */
    .quick-trade-body {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .qty-selector-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .qty-lbl {
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 600;
    }
    .qty-pills {
      display: flex;
      gap: 0.3rem;
    }
    .qty-pill {
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.45rem;
      border-radius: 4px;
      cursor: pointer;
    }
    .qty-pill.active {
      background: #38bdf8;
      color: #040813;
      border-color: #38bdf8;
    }
    .qty-input-box {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .stepper-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #f8fafc;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 800;
    }
    .qty-input {
      flex: 1;
      background: #0b1120;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 0.4rem;
      text-align: center;
      font-size: 0.95rem;
      font-weight: 700;
      border-radius: 6px;
      outline: none;
    }
    .est-total-line {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .est-total-line strong {
      color: #f8fafc;
    }
    .fast-action-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.6rem;
    }
    .fast-btn {
      border: none;
      padding: 0.6rem 0.5rem;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.15rem;
      transition: transform 0.1s ease, filter 0.15s ease;
    }
    .fast-btn:hover {
      filter: brightness(1.15);
    }
    .fast-btn:active {
      transform: scale(0.97);
    }
    .fast-buy-btn {
      background: linear-gradient(135deg, #059669, #10b981);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    .fast-sell-btn {
      background: linear-gradient(135deg, #dc2626, #ef4444);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }
    .fast-btn-title {
      font-size: 0.8rem;
      font-weight: 900;
      letter-spacing: 0.04em;
    }
    .fast-btn-price {
      font-size: 0.72rem;
      opacity: 0.9;
      font-family: monospace;
    }

    /* Live Order Book */
    .orderbook-table-container {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .ob-header-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      font-size: 0.68rem;
      color: #64748b;
      font-weight: 700;
      padding: 0.2rem 0.3rem;
    }
    .ob-row {
      position: relative;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      font-size: 0.75rem;
      padding: 0.2rem 0.3rem;
      border-radius: 3px;
      align-items: center;
    }
    .depth-bar {
      position: absolute;
      top: 0;
      bottom: 0;
      right: 0;
      opacity: 0.15;
      pointer-events: none;
      border-radius: 2px;
      transition: width 0.2s ease;
    }
    .ask-depth { background: #ef4444; }
    .bid-depth { background: #10b981; }
    .ob-spread-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      padding: 0.35rem 0.5rem;
      border-radius: 6px;
      margin: 0.25rem 0;
      transition: background 0.2s ease;
    }
    .ob-spread-banner.spread-flash-up { background: rgba(16, 185, 129, 0.2); }
    .ob-spread-banner.spread-flash-down { background: rgba(239, 68, 68, 0.2); }
    .spread-price {
      font-size: 0.9rem;
      color: #f8fafc;
    }
    .spread-tick-arrow {
      font-size: 0.75rem;
      margin-left: 0.3rem;
      color: #38bdf8;
    }
    .spread-right {
      font-size: 0.7rem;
      color: #94a3b8;
    }

    /* Live Time & Sales Tape */
    .vol-ratio-box {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.68rem;
      font-weight: 700;
    }
    .vol-ratio-track {
      width: 50px;
      height: 6px;
      background: #ef4444;
      border-radius: 3px;
      overflow: hidden;
    }
    .vol-ratio-buy {
      height: 100%;
      background: #10b981;
    }
    .tape-table-container {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      max-height: 240px;
      overflow-y: auto;
    }
    .tape-header-row {
      display: grid;
      grid-template-columns: 50px 38px 1fr 45px 1fr;
      font-size: 0.65rem;
      color: #64748b;
      font-weight: 700;
      padding: 0.2rem 0.3rem;
      border-bottom: 1px solid #1e293b;
    }
    .tape-stream-rows {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .tape-row {
      display: grid;
      grid-template-columns: 50px 38px 1fr 45px 1fr;
      align-items: center;
      font-size: 0.72rem;
      padding: 0.2rem 0.3rem;
      border-radius: 4px;
      animation: fadeInRow 0.2s ease;
    }
    @keyframes fadeInRow {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .tape-row.buy-trade { background: rgba(16, 185, 129, 0.04); }
    .tape-row.sell-trade { background: rgba(239, 68, 68, 0.04); }
    .tape-row.user-trade-row {
      background: rgba(245, 158, 11, 0.18) !important;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .tape-side-pill {
      font-size: 0.6rem;
      font-weight: 900;
      padding: 0.05rem 0.25rem;
      border-radius: 3px;
      text-align: center;
    }
    .side-buy {
      background: rgba(16, 185, 129, 0.25);
      color: #34d399;
    }
    .side-sell {
      background: rgba(239, 68, 68, 0.25);
      color: #f87171;
    }
    .tape-trader {
      font-size: 0.68rem;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-badge {
      background: #f59e0b;
      color: #040813;
      font-size: 0.65rem;
      font-weight: 900;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
    }

    /* TradingView Chart Styles */
    .section-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 1.25rem;
    }
    .chart-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .tv-chart-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 0.75rem;
    }
    .tv-asset-title-block {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .tv-symbol-title {
      font-size: 1.1rem;
      font-weight: 900;
      color: #f8fafc;
    }
    .tv-dot {
      color: #475569;
    }
    .tv-timeframe-tag {
      font-size: 0.75rem;
      color: #38bdf8;
      font-weight: 700;
      background: rgba(56, 189, 248, 0.12);
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
    }
    .tv-exchange-tag {
      font-size: 0.75rem;
      color: #64748b;
    }
    .tv-ohlc-hud {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.78rem;
      font-family: monospace;
      background: #070d19;
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      border: 1px solid #1e293b;
      margin-left: 0.35rem;
    }
    .hud-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .hud-lbl {
      color: #64748b;
      font-weight: 700;
    }
    .hud-val {
      color: #f8fafc;
    }
    .bar-countdown-tag {
      font-size: 0.75rem;
      color: #fbbf24;
      background: rgba(245, 158, 11, 0.12);
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      border: 1px solid rgba(245, 158, 11, 0.3);
      font-family: monospace;
      font-weight: 700;
    }

    .chart-controls-wrapper {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }
    .chart-type-pills, .timeframe-pills {
      display: flex;
      gap: 0.2rem;
      background: #070d19;
      padding: 0.2rem;
      border-radius: 8px;
      border: 1px solid #1e293b;
    }
    .type-btn, .tf-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s ease;
    }
    .type-btn:hover, .tf-btn:hover {
      color: #f8fafc;
      background: #1e293b;
    }
    .type-btn.active, .tf-btn.active {
      background: #2563eb;
      color: #ffffff;
    }
    .tf-btn.live-tf {
      color: #38bdf8;
    }
    .tf-btn.live-tf.active {
      background: #0284c7;
      color: #ffffff;
    }

    .chart-toggles {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .toggle-label {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      color: #94a3b8;
      cursor: pointer;
      font-weight: 600;
    }
    .legend-color {
      width: 10px;
      height: 3px;
      border-radius: 2px;
      display: inline-block;
    }
    .ma20-box { background: #f59e0b; }
    .ma50-box { background: #a855f7; }

    .tv-chart-wrapper {
      position: relative;
      width: 100%;
      background: #070d19;
      border: 1px solid #1e293b;
      border-radius: 8px;
      overflow: hidden;
    }
    .tv-price-chart-svg {
      width: 100%;
      height: auto;
      display: block;
    }
    .active-candle-glow {
      animation: pulseCandle 0.7s infinite alternate ease-in-out;
    }
    @keyframes pulseCandle {
      from { filter: drop-shadow(0 0 1px currentColor); opacity: 0.9; }
      to { filter: drop-shadow(0 0 5px currentColor); opacity: 1; }
    }
    .x-axis-labels {
      display: flex;
      justify-content: space-between;
      padding: 0.4rem 1rem;
      background: #0b1120;
      border-top: 1px solid #1e293b;
      font-size: 0.72rem;
      color: #64748b;
      font-family: monospace;
    }

    /* Tooltip */
    .tv-hover-tooltip {
      position: absolute;
      transform: translate(-50%, -100%);
      background: #0f172a;
      border: 1px solid #38bdf8;
      border-radius: 8px;
      padding: 0.6rem 0.85rem;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.7);
      pointer-events: none;
      z-index: 20;
      min-width: 180px;
    }
    .tooltip-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 0.35rem;
      margin-bottom: 0.35rem;
    }
    .tooltip-date {
      color: #94a3b8;
      font-size: 0.75rem;
    }
    .tooltip-pct {
      font-size: 0.75rem;
      font-weight: 800;
    }
    .tooltip-ohlc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.3rem 0.6rem;
      font-size: 0.75rem;
    }
    .ohlc-cell {
      display: flex;
      justify-content: space-between;
      gap: 0.4rem;
    }
    .ohlc-lbl {
      color: #64748b;
    }
    .ohlc-val {
      color: #f8fafc;
      font-family: monospace;
    }
    .tooltip-ma-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      color: #cbd5e1;
      margin-top: 0.25rem;
    }
    .ma-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .ma20-dot { background: #f59e0b; }
    .ma50-dot { background: #a855f7; }

    /* Indicator Cards */
    .indicators-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
      margin-top: 0.5rem;
    }
    .indicator-card {
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .indicator-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .indicator-title {
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 700;
    }
    .indicator-badge {
      font-size: 0.68rem;
      font-weight: 800;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
    }
    .badge-bullish { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .badge-bearish { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .badge-neutral { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; }
    .indicator-value {
      font-size: 1.25rem;
      font-weight: 800;
      color: #f8fafc;
    }
    .indicator-desc {
      font-size: 0.72rem;
      color: #64748b;
    }
    .rsi-meter-container {
      margin-top: 0.25rem;
    }
    .rsi-meter-track {
      position: relative;
      height: 8px;
      border-radius: 4px;
      display: flex;
      overflow: hidden;
      background: #1e293b;
    }
    .zone-oversold { width: 30%; background: #10b981; }
    .zone-neutral { width: 40%; background: #3b82f6; }
    .zone-overbought { width: 30%; background: #ef4444; }
    .rsi-needle {
      position: absolute;
      top: -2px;
      bottom: -2px;
      width: 3px;
      background: #ffffff;
      box-shadow: 0 0 6px #ffffff;
      transform: translateX(-50%);
    }
    .rsi-meter-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.65rem;
      color: #64748b;
      margin-top: 0.2rem;
    }

    /* Fundamentals Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .metric-card {
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .metric-label {
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 600;
    }
    .metric-value {
      font-size: 1.35rem;
      font-weight: 800;
      color: #f8fafc;
    }
    .sector-text {
      color: #38bdf8;
      font-size: 1.1rem;
    }
    .metric-sub {
      font-size: 0.7rem;
      color: #64748b;
    }

    /* Buttons */
    .btn {
      padding: 0.55rem 1.1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }
    .btn-buy {
      background: #10b981;
      color: #ffffff;
    }
    .btn-buy:hover { background: #059669; }
    .btn-sell {
      background: #ef4444;
      color: #ffffff;
    }
    .btn-sell:hover { background: #dc2626; }
    .btn-watchlist-add {
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #334155;
    }
    .btn-watchlist-add:hover {
      background: #334155;
    }
    .btn-watchlist-active {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .order-toast {
      position: sticky;
      top: 1rem;
      z-index: 100;
    }
    .toast-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 700;
    }
    .toast-close {
      background: none;
      border: none;
      color: #ffffff;
      cursor: pointer;
      font-size: 1rem;
    }
    .text-green { color: #10b981; }
    .text-red { color: #ef4444; }
    .text-right { text-align: right; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; }
  `]
})
export class StockDetailsComponent implements OnInit, OnDestroy {
  symbol = '';
  stock: StockDetail | null = null;
  liveQuote: MarketQuote | null = null;
  technicalData: TechnicalAnalysis | null = null;
  isForex = false;

  isLoading = true;
  isLoadingTechnical = false;
  errorMessage = '';

  // Real-time tick & trade simulation engine
  isLiveStreaming = true;
  tickIntervalMs = 1000;
  volatilityMultiplier = 1.0;
  soundEnabled = true;
  liveTradesCount = 0;
  sessionVolume = 142500;
  lastTickDirection = 0;
  isPriceFlashingUp = false;
  isPriceFlashingDown = false;
  buyVolumePct = 54;
  barCountdownSec = 1;

  currentBid = 0;
  currentAsk = 0;
  orderBookBids: OrderBookLevel[] = [];
  orderBookAsks: OrderBookLevel[] = [];
  liveTrades: LiveTrade[] = [];

  // Fast 1-Click trade state
  quickTradeQty = 10;
  isExecutingQuickTrade = false;
  orderNotification = '';

  // Universal Search
  searchQuery = '';
  searchResults: MarketSearchResult[] = [];
  isSearching = false;
  showSearchDropdown = false;
  private searchDebounceTimer: any = null;

  // Chart Properties
  chartType: 'candle' | 'line' = 'candle';
  selectedTimeframe = '1s';
  timeframeOptions: TimeframeOption[] = [
    { id: '1s', label: '⚡ 1s', type: 'second', seconds: 1 },
    { id: '5s', label: '⚡ 5s', type: 'second', seconds: 5 },
    { id: '1m', label: '1m', type: 'minute', seconds: 60 },
    { id: '5m', label: '5m', type: 'minute', seconds: 300 },
    { id: '15m', label: '15m', type: 'minute', seconds: 900 },
    { id: '1D', label: '1D', type: 'day', seconds: 86400 },
    { id: '1M', label: '1M', type: 'month', seconds: 2592000 },
    { id: '6M', label: '6M', type: 'month', seconds: 15552000 },
    { id: '1Y', label: '1Y', type: 'year', seconds: 31536000 },
    { id: '5Y', label: '5Y', type: 'year', seconds: 157680000 }
  ];

  showMA20 = true;
  showMA50 = true;

  chartWidth = 880;
  chartHeight = 380;
  paddingLeft = 15;
  paddingRight = 75;
  paddingTop = 20;
  paddingBottom = 25;

  pricePoints: ChartPoint[] = [];
  linePathD = '';
  areaPathD = '';
  ma20PathD = '';
  ma50PathD = '';
  gridLinesY: { y: number; price: number }[] = [];
  axisLabels: string[] = [];
  currentPriceY: number | null = null;

  hoveredPoint: ChartPoint | null = null;
  tooltipX = 0;
  tooltipY = 0;

  // Modals & Watchlist
  showTradeModal = false;
  tradeType: 'BUY' | 'SELL' = 'BUY';
  isUpdatingWatchlist = false;

  private liveTickTimer: any = null;
  private audioCtx: AudioContext | null = null;
  private accumulatedTicksForBar = 0;
  private activeBarOpenPrice = 0;
  private activeBarHighPrice = 0;
  private activeBarLowPrice = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private marketService: MarketService,
    private marketDataService: MarketDataService,
    public watchlistService: WatchlistService,
    private analysisService: AnalysisService,
    private tradeService: TradeService
  ) {}

  get currentOHLC(): { open: number; high: number; low: number; close: number; change: number; changePercent: number } | null {
    if (this.hoveredPoint) {
      const open = this.hoveredPoint.open ?? this.hoveredPoint.price;
      const high = this.hoveredPoint.high ?? this.hoveredPoint.price;
      const low = this.hoveredPoint.low ?? this.hoveredPoint.price;
      const close = this.hoveredPoint.close ?? this.hoveredPoint.price;
      const chg = close - open;
      const chgPct = open > 0 ? (chg / open) * 100 : 0;
      return { open, high, low, close, change: chg, changePercent: chgPct };
    }

    if (this.pricePoints.length > 0) {
      const last = this.pricePoints[this.pricePoints.length - 1];
      const open = last.open ?? last.price;
      const high = last.high ?? last.price;
      const low = last.low ?? last.price;
      const close = last.close ?? (this.liveQuote?.price ?? last.price);
      const chg = close - open;
      const chgPct = open > 0 ? (chg / open) * 100 : 0;
      return { open, high, low, close, change: chg, changePercent: chgPct };
    }

    if (this.liveQuote) {
      const p = this.liveQuote.price;
      const chg = this.liveQuote.change ?? 0;
      const open = p - chg;
      return { open, high: Math.max(open, p), low: Math.min(open, p), close: p, change: chg, changePercent: this.liveQuote.changePercent ?? 0 };
    }

    return null;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const sym = params.get('symbol');
      if (sym) {
        this.symbol = sym.toUpperCase();
        this.isForex = this.symbol.includes('/') || this.symbol.startsWith('USD') || this.symbol.startsWith('EUR') || this.symbol.startsWith('GBP');
        this.reloadAll();
      }
    });

    this.startLiveTickStream();
  }

  ngOnDestroy(): void {
    this.stopLiveTickStream();
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch {}
    }
  }

  toggleLiveStreaming(): void {
    this.isLiveStreaming = !this.isLiveStreaming;
    if (this.isLiveStreaming) {
      this.startLiveTickStream();
    } else {
      this.stopLiveTickStream();
    }
  }

  setTickSpeed(ms: number): void {
    this.tickIntervalMs = ms;
    if (this.isLiveStreaming) {
      this.stopLiveTickStream();
      this.startLiveTickStream();
    }
  }

  private startLiveTickStream(): void {
    this.stopLiveTickStream();
    this.liveTickTimer = setInterval(() => {
      if (this.isLiveStreaming && !this.isLoading && this.stock) {
        this.onLiveTick();
      }
    }, this.tickIntervalMs);
  }

  private stopLiveTickStream(): void {
    if (this.liveTickTimer) {
      clearInterval(this.liveTickTimer);
      this.liveTickTimer = null;
    }
  }

  /**
   * Main Real-Time Second-by-Second Tick Handler
   */
  private onLiveTick(): void {
    const currentPrice = this.liveQuote?.price ?? (this.stock?.price || 150.0);
    const isFx = this.isForex;

    // Fractional micro tick calculation
    const basePct = isFx ? 0.0003 : 0.0014;
    const deltaRange = currentPrice * basePct * this.volatilityMultiplier;
    const rand = (Math.random() - 0.49);
    const tickDelta = rand * deltaRange;

    let newPrice = currentPrice + tickDelta;
    if (newPrice <= 0) newPrice = currentPrice;

    newPrice = isFx ? Math.round(newPrice * 10000) / 10000 : Math.round(newPrice * 100) / 100;

    const direction = newPrice >= currentPrice ? 1 : -1;
    this.lastTickDirection = direction;

    if (direction > 0) {
      this.isPriceFlashingUp = true;
      this.isPriceFlashingDown = false;
      setTimeout(() => this.isPriceFlashingUp = false, 350);
    } else {
      this.isPriceFlashingDown = true;
      this.isPriceFlashingUp = false;
      setTimeout(() => this.isPriceFlashingDown = false, 350);
    }

    this.playTickSound(direction > 0);

    const refPrice = this.stock?.price || currentPrice;
    const change = newPrice - refPrice;
    const changePercent = refPrice > 0 ? (change / refPrice) * 100 : 0;

    this.liveQuote = {
      symbol: this.symbol,
      price: newPrice,
      change: isFx ? Math.round(change * 10000) / 10000 : Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      timestamp: new Date().toISOString(),
      marketStatus: 'OPEN'
    };

    const spreadHalf = (isFx ? 0.0002 : 0.02);
    this.currentBid = isFx ? Math.round((newPrice - spreadHalf) * 10000) / 10000 : Math.round((newPrice - spreadHalf) * 100) / 100;
    this.currentAsk = isFx ? Math.round((newPrice + spreadHalf) * 10000) / 10000 : Math.round((newPrice + spreadHalf) * 100) / 100;
    this.generateOrderBook(newPrice);

    // Live Execution Flow
    const tradeSize = isFx ? Math.floor(Math.random() * 5 + 1) * 10000 : Math.floor(Math.random() * 40 + 5) * 10;
    const isBuy = Math.random() > 0.46;
    const tradePrice = isBuy ? this.currentAsk : this.currentBid;
    this.sessionVolume += tradeSize;
    this.liveTradesCount++;

    const traders = [
      'Citadel Securities', 'Morgan Stanley Flow', 'Retail Buy Flow', 'Algo Market Maker',
      'Goldman Sachs Block', 'Jane Street Liquidity', 'Virtu Financial', 'Two Sigma Quant',
      'Institutional Bid', 'Retail Sell Flow', 'JP Morgan Prime'
    ];
    const trader = traders[Math.floor(Math.random() * traders.length)];

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8) + '.' + Math.floor(now.getMilliseconds() / 100);

    this.liveTrades.unshift({
      id: Math.random().toString(36).substring(2, 9),
      time: timeStr,
      type: isBuy ? 'BUY' : 'SELL',
      price: tradePrice,
      size: tradeSize,
      total: tradeSize * tradePrice,
      trader: trader
    });

    if (this.liveTrades.length > 30) {
      this.liveTrades.pop();
    }

    const buys = this.liveTrades.filter(t => t.type === 'BUY').length;
    this.buyVolumePct = Math.round((buys / this.liveTrades.length) * 100) || 50;

    // Real-Time Candlestick Generation & Second-by-Second Mutation
    this.processLiveCandleTick(newPrice);
  }

  /**
   * Appends or mutates the live candle bar based on current timeframe
   */
  private processLiveCandleTick(price: number): void {
    if (!this.pricePoints || this.pricePoints.length === 0) {
      this.initIntradayCandles(price);
      return;
    }

    const tf = this.selectedTimeframe;
    const now = new Date();
    const timeLabel = now.toTimeString().slice(0, 8);

    let targetTicksPerBar = 1; // for '1s', 1 tick = 1 new bar!
    if (tf === '5s') targetTicksPerBar = 5;
    else if (tf === '1m') targetTicksPerBar = 30;
    else if (tf === '5m') targetTicksPerBar = 60;
    else if (tf === '15m') targetTicksPerBar = 120;
    else targetTicksPerBar = 20; // 1D, 1M, etc.

    this.accumulatedTicksForBar++;
    this.barCountdownSec = Math.max(1, targetTicksPerBar - this.accumulatedTicksForBar);

    if (this.accumulatedTicksForBar >= targetTicksPerBar) {
      this.accumulatedTicksForBar = 0;
      this.barCountdownSec = targetTicksPerBar;

      // Close current bar, start NEW live bar
      const newPoint: ChartPoint = {
        x: 0,
        y: 0,
        date: now.toISOString().slice(0, 10),
        timeLabel: timeLabel,
        price: price,
        open: price,
        high: price,
        low: price,
        close: price,
        isBullish: true
      };

      this.pricePoints.push(newPoint);

      // Keep maximum 45 candles on screen so it scrolls dynamically to the left
      const maxBars = (tf === '1s' || tf === '5s' || tf === '1m') ? 42 : 55;
      if (this.pricePoints.length > maxBars) {
        this.pricePoints.shift();
      }

      this.recalculateChartGeometry();
    } else {
      // Mutate existing active bar
      const last = this.pricePoints[this.pricePoints.length - 1];
      last.close = price;
      last.price = price;
      last.high = Math.max(last.high ?? price, price);
      last.low = Math.min(last.low ?? price, price);
      last.isBullish = last.close >= (last.open ?? last.close);

      this.recalculateChartGeometry();
    }
  }

  private recalculateChartGeometry(): void {
    const n = this.pricePoints.length;
    if (n === 0) return;

    const plotWidth = this.chartWidth - this.paddingLeft - this.paddingRight;
    const plotHeight = this.chartHeight - this.paddingTop - this.paddingBottom;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    for (const pt of this.pricePoints) {
      const l = pt.low ?? pt.price;
      const h = pt.high ?? pt.price;
      if (l < minPrice) minPrice = l;
      if (h > maxPrice) maxPrice = h;
    }
    const priceBuffer = (maxPrice - minPrice) * 0.08 || 0.5;
    const effectiveMin = minPrice - priceBuffer;
    const effectiveMax = maxPrice + priceBuffer;
    const priceRange = effectiveMax - effectiveMin || 1;

    let candleWidth = 8;
    if (n <= 30) candleWidth = Math.min(18, Math.max(10, (plotWidth / n) * 0.75));
    else if (n <= 50) candleWidth = Math.max(6, (plotWidth / n) * 0.72);
    else candleWidth = Math.max(3, (plotWidth / n) * 0.65);

    const startPrice = this.pricePoints[0].open ?? this.pricePoints[0].price;

    this.pricePoints.forEach((pt, i) => {
      pt.x = this.paddingLeft + (i / Math.max(1, n - 1)) * plotWidth;
      const close = pt.close ?? pt.price;
      const open = pt.open ?? close;
      const high = pt.high ?? Math.max(open, close);
      const low = pt.low ?? Math.min(open, close);

      pt.y = this.chartHeight - this.paddingBottom - ((close - effectiveMin) / priceRange) * plotHeight;
      pt.closeY = pt.y;
      pt.openY = this.chartHeight - this.paddingBottom - ((open - effectiveMin) / priceRange) * plotHeight;
      pt.highY = this.chartHeight - this.paddingBottom - ((high - effectiveMin) / priceRange) * plotHeight;
      pt.lowY = this.chartHeight - this.paddingBottom - ((low - effectiveMin) / priceRange) * plotHeight;

      pt.bodyTop = Math.min(pt.openY, pt.closeY);
      pt.bodyHeight = Math.max(3, Math.abs(pt.openY - pt.closeY));
      pt.width = candleWidth;
      pt.isBullish = close >= open;
      pt.changeFromStart = startPrice > 0 ? ((close - startPrice) / startPrice) * 100 : 0;
    });

    const latestPrice = this.liveQuote?.price ?? (this.pricePoints[n - 1].close ?? this.stock?.price ?? 150.0);
    this.currentPriceY = this.chartHeight - this.paddingBottom - ((latestPrice - effectiveMin) / priceRange) * plotHeight;

    // Line Path
    let lineD = '';
    this.pricePoints.forEach((pt, i) => {
      lineD += (i === 0 ? 'M ' : ' L ') + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1);
    });
    this.linePathD = lineD;

    const bottomY = this.chartHeight - this.paddingBottom;
    const firstX = this.pricePoints[0].x.toFixed(1);
    const lastX = this.pricePoints[n - 1].x.toFixed(1);
    this.areaPathD = `${lineD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    // Horizontal Grid Lines with Price Ticks
    this.gridLinesY = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const p = effectiveMin + (i / steps) * priceRange;
      const y = this.chartHeight - this.paddingBottom - (i / steps) * plotHeight;
      this.gridLinesY.push({ y, price: p });
    }

    // Dynamic X-Axis Labels (Time or Dates)
    this.axisLabels = [];
    const labelSteps = Math.min(5, n);
    for (let i = 0; i < labelSteps; i++) {
      const idx = Math.floor((i / (labelSteps - 1)) * (n - 1));
      const pt = this.pricePoints[idx];
      this.axisLabels.push(pt.timeLabel || pt.date);
    }
  }

  private initIntradayCandles(basePrice: number): void {
    const isFx = this.isForex;
    const now = Date.now();
    const count = 35;
    const points: ChartPoint[] = [];

    let curP = basePrice * 0.992;
    for (let i = 0; i < count; i++) {
      const t = new Date(now - (count - i) * 1000);
      const timeLabel = t.toTimeString().slice(0, 8);
      const delta = (Math.random() - 0.48) * (curP * (isFx ? 0.0004 : 0.0018));
      const nextP = Math.max(1, curP + delta);

      const open = curP;
      const close = nextP;
      const high = Math.max(open, close) + Math.random() * (curP * (isFx ? 0.0002 : 0.0008));
      const low = Math.min(open, close) - Math.random() * (curP * (isFx ? 0.0002 : 0.0008));

      points.push({
        x: 0,
        y: 0,
        date: t.toISOString().slice(0, 10),
        timeLabel: timeLabel,
        price: isFx ? Math.round(close * 10000) / 10000 : Math.round(close * 100) / 100,
        open: isFx ? Math.round(open * 10000) / 10000 : Math.round(open * 100) / 100,
        high: isFx ? Math.round(high * 10000) / 10000 : Math.round(high * 100) / 100,
        low: isFx ? Math.round(low * 10000) / 10000 : Math.round(low * 100) / 100,
        close: isFx ? Math.round(close * 10000) / 10000 : Math.round(close * 100) / 100,
        isBullish: close >= open
      });
      curP = nextP;
    }
    this.pricePoints = points;
    this.recalculateChartGeometry();
  }

  private generateOrderBook(midPrice: number): void {
    const isFx = this.isForex;
    const step = isFx ? 0.0004 : (midPrice > 200 ? 0.25 : 0.10);

    const bids: OrderBookLevel[] = [];
    let bidAccum = 0;
    for (let i = 1; i <= 5; i++) {
      const p = isFx ? Math.round((midPrice - i * step) * 10000) / 10000 : Math.round((midPrice - i * step) * 100) / 100;
      const size = Math.floor(Math.random() * 80 + 20) * 10;
      bidAccum += size;
      bids.push({ price: p, size, total: bidAccum, depthPercent: Math.min(100, (bidAccum / 2500) * 100) });
    }
    this.orderBookBids = bids;

    const asks: OrderBookLevel[] = [];
    let askAccum = 0;
    for (let i = 5; i >= 1; i--) {
      const p = isFx ? Math.round((midPrice + i * step) * 10000) / 10000 : Math.round((midPrice + i * step) * 100) / 100;
      const size = Math.floor(Math.random() * 80 + 20) * 10;
      askAccum += size;
      asks.push({ price: p, size, total: askAccum, depthPercent: Math.min(100, (askAccum / 2500) * 100) });
    }
    this.orderBookAsks = asks;
  }

  execute1ClickTrade(type: 'BUY' | 'SELL'): void {
    if (!this.stock || this.isExecutingQuickTrade) return;

    this.isExecutingQuickTrade = true;
    const price = type === 'BUY' ? this.currentAsk : this.currentBid;
    const qty = this.quickTradeQty || 10;

    const req: OrderRequest = {
      stockId: this.stock.id,
      type: type,
      quantity: qty,
      price: price
    };

    this.tradeService.placeOrder(req).subscribe({
      next: (order) => {
        this.isExecutingQuickTrade = false;
        this.playTradeSound();

        const now = new Date();
        const timeStr = now.toTimeString().slice(0, 8) + '.' + Math.floor(now.getMilliseconds() / 100);
        this.liveTrades.unshift({
          id: 'user-' + Date.now(),
          time: timeStr,
          type: type,
          price: price,
          size: qty,
          total: qty * price,
          trader: 'YOUR ACCOUNT',
          isUserOrder: true
        });

        this.orderNotification = `🎉 1-Click Execution: ${type} ${qty} shares of ${this.symbol} @ \$${price.toFixed(isForexDecimals(this.isForex))} filled instantly!`;
        setTimeout(() => this.orderNotification = '', 6000);
      },
      error: () => {
        this.isExecutingQuickTrade = false;
        this.playTradeSound();
        const now = new Date();
        const timeStr = now.toTimeString().slice(0, 8) + '.' + Math.floor(now.getMilliseconds() / 100);
        this.liveTrades.unshift({
          id: 'user-' + Date.now(),
          time: timeStr,
          type: type,
          price: price,
          size: qty,
          total: qty * price,
          trader: 'YOUR ACCOUNT',
          isUserOrder: true
        });
        this.orderNotification = `✓ Simulated Execution: ${type} ${qty} ${this.symbol} @ \$${price.toFixed(isForexDecimals(this.isForex))}`;
        setTimeout(() => this.orderNotification = '', 6000);
      }
    });
  }

  private playTickSound(isUp: boolean): void {
    if (!this.soundEnabled) return;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isUp ? 880 : 540, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.015, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.04);
    } catch {}
  }

  private playTradeSound(): void {
    if (!this.soundEnabled) return;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1046.5, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1318.5, this.audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.07, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.25);
    } catch {}
  }

  reloadAll(): void {
    this.loadStockDetails(this.symbol);
    this.loadMarketQuote(this.symbol);
    this.loadTechnicalAnalysis(this.symbol);
    this.initInitialTradesTape();
  }

  private initInitialTradesTape(): void {
    this.liveTrades = [];
    const traders = [
      'Citadel Securities', 'Morgan Stanley Flow', 'Retail Buy Flow', 'Algo MM',
      'Goldman Sachs Block', 'Jane Street Liquidity', 'Virtu Financial', 'Two Sigma Quant'
    ];
    const baseP = this.stock?.price || 150.0;
    const now = Date.now();

    for (let i = 0; i < 15; i++) {
      const isBuy = Math.random() > 0.48;
      const t = new Date(now - (15 - i) * 1500);
      const timeStr = t.toTimeString().slice(0, 8) + '.' + Math.floor(t.getMilliseconds() / 100);
      const delta = (Math.random() - 0.5) * (baseP * 0.002);
      const p = Math.round((baseP + delta) * (this.isForex ? 10000 : 100)) / (this.isForex ? 10000 : 100);
      const size = Math.floor(Math.random() * 30 + 5) * 10;

      this.liveTrades.unshift({
        id: 'init-' + i,
        time: timeStr,
        type: isBuy ? 'BUY' : 'SELL',
        price: p,
        size: size,
        total: size * p,
        trader: traders[i % traders.length]
      });
    }
    const buys = this.liveTrades.filter(t => t.type === 'BUY').length;
    this.buyVolumePct = Math.round((buys / this.liveTrades.length) * 100) || 52;
  }

  onSearchInput(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    if (!this.searchQuery || this.searchQuery.trim().length === 0) {
      this.searchResults = [];
      this.showSearchDropdown = false;
      return;
    }

    this.searchDebounceTimer = setTimeout(() => {
      const q = this.searchQuery.trim().toUpperCase();
      this.isSearching = true;

      this.marketDataService.search(q).subscribe({
        next: (results) => {
          this.isSearching = false;
          if (results && results.length > 0) {
            this.searchResults = results;
          } else {
            this.searchResults = [
              { symbol: q, description: `${q} Worldwide Asset`, type: q.includes('/') ? 'Forex' : 'Common Stock', exchange: 'Global' }
            ];
          }
          this.showSearchDropdown = true;
        },
        error: () => {
          this.isSearching = false;
          this.searchResults = [
            { symbol: q, description: `${q} Worldwide Asset`, type: q.includes('/') ? 'Forex' : 'Common Stock', exchange: 'Global' }
          ];
          this.showSearchDropdown = true;
        }
      });
    }, 200);
  }

  onSearchEnter(): void {
    if (this.searchQuery && this.searchQuery.trim().length > 0) {
      const sym = this.searchQuery.trim().toUpperCase();
      this.showSearchDropdown = false;
      this.searchQuery = '';
      this.router.navigate(['/market', sym]);
    }
  }

  selectSearchResult(item: MarketSearchResult): void {
    this.showSearchDropdown = false;
    this.searchQuery = '';
    this.router.navigate(['/market', item.symbol]);
  }

  setChartType(type: 'candle' | 'line'): void {
    this.chartType = type;
  }

  setTimeframe(tf: string): void {
    this.selectedTimeframe = tf;
    const baseP = this.liveQuote?.price ?? (this.stock?.price || 150.0);

    if (tf === '1s' || tf === '5s' || tf === '1m' || tf === '5m' || tf === '15m') {
      this.initIntradayCandles(baseP);
    } else {
      this.buildHistoricalChartPaths();
    }
  }

  loadMarketQuote(sym?: string): void {
    const symbolToFetch = sym || this.symbol;
    if (!symbolToFetch) return;

    this.marketDataService.getQuote(symbolToFetch).subscribe({
      next: (quote) => {
        this.liveQuote = quote;
        const p = quote.price;
        const spreadHalf = (this.isForex ? 0.0002 : 0.02);
        this.currentBid = this.isForex ? Math.round((p - spreadHalf) * 10000) / 10000 : Math.round((p - spreadHalf) * 100) / 100;
        this.currentAsk = this.isForex ? Math.round((p + spreadHalf) * 10000) / 10000 : Math.round((p + spreadHalf) * 100) / 100;
        this.generateOrderBook(p);
      },
      error: () => {}
    });
  }

  loadStockDetails(symbol: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.marketService.getStockDetail(symbol).subscribe({
      next: (data) => {
        this.stock = data;
        this.isForex = (data.sector && data.sector.toLowerCase().includes('forex')) || symbol.includes('/');
        const p = data.price || 150.0;
        const spreadHalf = (this.isForex ? 0.0002 : 0.02);
        this.currentBid = this.isForex ? Math.round((p - spreadHalf) * 10000) / 10000 : Math.round((p - spreadHalf) * 100) / 100;
        this.currentAsk = this.isForex ? Math.round((p + spreadHalf) * 10000) / 10000 : Math.round((p + spreadHalf) * 100) / 100;
        this.generateOrderBook(p);
        this.initIntradayCandles(p);
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || `Failed to load stock details for ${symbol}`;
      }
    });
  }

  loadTechnicalAnalysis(symbol: string): void {
    this.isLoadingTechnical = true;
    this.analysisService.getTechnicalAnalysis(symbol).subscribe({
      next: (data) => {
        this.technicalData = data;
        this.isLoadingTechnical = false;
        if (this.selectedTimeframe !== '1s' && this.selectedTimeframe !== '5s' && this.selectedTimeframe !== '1m') {
          this.buildHistoricalChartPaths();
        }
      },
      error: (err) => {
        this.isLoadingTechnical = false;
        console.error('Failed to load technical analysis:', err);
      }
    });
  }

  buildHistoricalChartPaths(): void {
    if (!this.technicalData || !this.technicalData.priceHistory || this.technicalData.priceHistory.length === 0) {
      return;
    }

    let fullHistory = this.technicalData.priceHistory.map(h => ({ ...h }));
    let history = fullHistory;
    const count = history.length;

    if (this.selectedTimeframe === '1D') {
      history = history.slice(Math.max(0, count - 15));
    } else if (this.selectedTimeframe === '1M') {
      history = history.slice(Math.max(0, count - 22));
    } else if (this.selectedTimeframe === '6M') {
      history = history.slice(Math.max(0, count - 126));
    } else if (this.selectedTimeframe === '1Y') {
      history = history.slice(Math.max(0, count - 252));
    } else if (this.selectedTimeframe === '5Y') {
      history = history.slice(Math.max(0, count - 1260));
    }

    const n = history.length;
    if (n === 0) return;

    this.pricePoints = history.map(item => ({
      x: 0,
      y: 0,
      date: item.date,
      timeLabel: item.date,
      price: item.closePrice,
      open: item.openPrice ?? item.closePrice,
      high: item.highPrice ?? item.closePrice,
      low: item.lowPrice ?? item.closePrice,
      close: item.closePrice,
      isBullish: (item.closePrice) >= (item.openPrice ?? item.closePrice)
    }));

    this.recalculateChartGeometry();
  }

  buildChartPaths(): void {
    if (this.selectedTimeframe === '1s' || this.selectedTimeframe === '5s' || this.selectedTimeframe === '1m') {
      this.recalculateChartGeometry();
    } else {
      this.buildHistoricalChartPaths();
    }
  }

  onChartMouseMove(event: MouseEvent): void {
    if (!this.pricePoints || this.pricePoints.length === 0) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const containerWidth = rect.width;

    const chartX = (mouseX / containerWidth) * this.chartWidth;

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

    const pixelX = (closest.x / this.chartWidth) * containerWidth;
    const pixelY = (closest.y / this.chartHeight) * rect.height;

    this.tooltipX = Math.max(100, Math.min(containerWidth - 100, pixelX));
    this.tooltipY = Math.max(25, pixelY - 15);
  }

  getMaSignal(currentPrice: number, ma: number | null): string {
    if (ma === null || !currentPrice) return 'Neutral';
    return currentPrice >= ma ? 'Bullish (Above MA)' : 'Bearish (Below MA)';
  }

  getMaSignalClass(currentPrice: number, ma: number | null): string {
    if (ma === null || !currentPrice) return 'badge-neutral';
    return currentPrice >= ma ? 'badge-bullish' : 'badge-bearish';
  }

  getPriceVsMaPercent(currentPrice: number, ma: number): string {
    if (!ma || !currentPrice) return '';
    const diff = ((currentPrice - ma) / ma) * 100;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(2)}% vs`;
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

  toggleWatchlist(): void {
    if (!this.stock || this.isUpdatingWatchlist) return;

    this.isUpdatingWatchlist = true;
    const stockId = this.stock.id;

    if (this.stock.inWatchlist) {
      this.watchlistService.removeFromWatchlist(stockId).subscribe({
        next: () => {
          if (this.stock) this.stock.inWatchlist = false;
          this.isUpdatingWatchlist = false;
        },
        error: (err) => {
          this.isUpdatingWatchlist = false;
          alert(err?.error?.message || 'Failed to remove from watchlist');
        }
      });
    } else {
      this.watchlistService.addToWatchlist(stockId).subscribe({
        next: () => {
          if (this.stock) this.stock.inWatchlist = true;
          this.isUpdatingWatchlist = false;
        },
        error: (err) => {
          this.isUpdatingWatchlist = false;
          alert(err?.error?.message || 'Failed to add to watchlist');
        }
      });
    }
  }

  openTrade(type: 'BUY' | 'SELL'): void {
    this.tradeType = type;
    this.showTradeModal = true;
  }

  onOrderSuccess(order: OrderResponse): void {
    this.orderNotification = `Order #${order.orderId} executed: ${order.type} ${order.quantity} shares of ${order.symbol} at \$${order.price.toFixed(2)}`;
    setTimeout(() => {
      this.orderNotification = '';
    }, 6000);
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

function isForexDecimals(isForex: boolean): number {
  return isForex ? 4 : 2;
}
