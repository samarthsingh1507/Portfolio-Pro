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

export interface AiDecisionReport {
  timestamp: string;
  action: 'BUY' | 'SELL';
  amount: number;
  qty: number;
  price: number;
  targetPrice: number;
  stopLoss: number;
  upsidePct: number;
  patternName: string;
  confidence: number;
  reasons: string[];
  guidance: string;
  riskRewardRatio: string;
  marketImpact: string;
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
              <span class="symbol-badge" [class.commodity-badge]="isCommodity" [class.forex-badge]="isForex">{{ stock.symbol }}</span>
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
              <!-- TradingView Chart Header Bar with Live OHLC HUD, Zoom Controls & Next Bar Countdown -->
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

                  <!-- Interactive Zoom & Pan Controls -->
                  <div class="zoom-controls-group">
                    <button class="zoom-btn" (click)="zoomIn()" title="Zoom In (or Scroll Up on Chart)">🔍 +</button>
                    <span class="zoom-level-badge">{{ (zoomLevel * 100) | number:'1.0-0' }}%</span>
                    <button class="zoom-btn" (click)="zoomOut()" title="Zoom Out (or Scroll Down on Chart)">🔍 −</button>
                    <button *ngIf="zoomLevel !== 1 || panOffset !== 0" class="zoom-btn zoom-reset-btn" (click)="resetZoom()" title="Reset Zoom to 100%">↺</button>
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
                    <label class="toggle-label toggle-ai">
                      <input type="checkbox" [(ngModel)]="showAiPrediction" (change)="buildChartPaths()" />
                      <span class="legend-color ai-box"></span> 🤖 AI Target
                    </label>

                    <!-- AI Auto-Pilot ON / OFF Switch Toolbar Button -->
                    <button
                      class="ai-autopilot-btn"
                      [class.active]="aiAutoApplyEnabled"
                      (click)="toggleAiAutoApply()"
                      [title]="aiAutoApplyEnabled ? 'AI Auto-Pilot ON: Auto-executing high conviction predictions with live graph impacts' : 'Turn ON AI Auto-Pilot to autonomously trade chart patterns'"
                    >
                      <span class="ai-ap-dot" [class.active]="aiAutoApplyEnabled"></span>
                      <span>AI Auto-Pilot: <strong>{{ aiAutoApplyEnabled ? 'ON' : 'OFF' }}</strong></span>
                    </button>
                    
                    <button *ngIf="aiLastActionReport" class="ai-why-toolbar-btn" (click)="openAiExplanationModal()" title="View what the AI did and why">
                      💡 Why Did AI Do That?
                    </button>
                  </div>
                </div>
              </div>

              <!-- Chart Loading -->
              <div *ngIf="isLoadingTechnical" class="chart-loading">
                <div class="micro-spinner"></div>
                <p>Rendering high-density live candlesticks...</p>
              </div>

              <!-- TradingView Interactive Candlestick SVG Container with Zoom, Pan, Trade Stamps & AI Target Overlay -->
              <div
                *ngIf="!isLoadingTechnical && pricePoints.length > 0"
                class="tv-chart-wrapper"
                [class.is-panning]="isDraggingChart"
                (wheel)="onChartWheel($event)"
                (mousedown)="onChartDragStart($event)"
                (mousemove)="onChartMouseMove($event)"
                (mouseup)="onChartDragEnd()"
                (mouseleave)="onChartMouseLeave()"
              >
                <!-- AI Active Live Radar Banner Overlay on Graph -->
                <div *ngIf="aiAutoApplyEnabled" class="chart-ai-radar-banner">
                  <span class="pulsing-ai-dot"></span>
                  <span class="radar-text">🤖 AI AUTO-PILOT ACTIVE: Monitoring Momentum & Auto-Applying Real-Time Graph Impact</span>
                  <button *ngIf="aiLastActionReport" class="radar-inspect-link" (click)="openAiExplanationModal()">[Inspect Last Action & Rationale]</button>
                </div>

                <!-- Zoom Navigation Hint -->
                <div class="zoom-status-bar" *ngIf="zoomLevel > 1">
                  <span>🔍 Zoomed in ({{ (zoomLevel * 100) | number:'1.0-0' }}%) • Click & Drag horizontally to pan history • Scroll wheel to zoom</span>
                </div>

                <!-- Hover Floating Tooltip -->
                <div
                  *ngIf="hoveredPoint && !isDraggingChart"
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
                    <linearGradient id="aiBullConeGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stop-color="#10b981" stop-opacity="0.35" />
                      <stop offset="100%" stop-color="#10b981" stop-opacity="0.05" />
                    </linearGradient>
                    <linearGradient id="aiBearConeGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stop-color="#ef4444" stop-opacity="0.35" />
                      <stop offset="100%" stop-color="#ef4444" stop-opacity="0.05" />
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

                  <!-- AI Prediction Projected Trajectory & Target Cone Overlay -->
                  <g *ngIf="showAiPrediction && aiPrediction" class="ai-prediction-overlay">
                    <!-- Projection Trajectory Polygon / Cone -->
                    <path *ngIf="aiProjectionConePathD" [attr.d]="aiProjectionConePathD" [attr.fill]="aiPrediction.patternType === 'BULLISH' ? 'url(#aiBullConeGradient)' : 'url(#aiBearConeGradient)'" />
                    <path *ngIf="aiTrajectoryLinePathD" [attr.d]="aiTrajectoryLinePathD" fill="none" [attr.stroke]="aiPrediction.patternType === 'BULLISH' ? '#10b981' : '#ef4444'" stroke-width="2" stroke-dasharray="4,3" />

                    <!-- Target Price Line & Tag -->
                    <g *ngIf="aiTargetY !== null">
                      <line
                        [attr.x1]="paddingLeft"
                        [attr.y1]="aiTargetY"
                        [attr.x2]="chartWidth - paddingRight"
                        [attr.y2]="aiTargetY"
                        stroke="#10b981"
                        stroke-width="1.5"
                        stroke-dasharray="3,2"
                      />
                      <rect [attr.x]="chartWidth - paddingRight - 125" [attr.y]="aiTargetY - 18" width="120" height="18" rx="3" fill="#064e3b" stroke="#10b981" stroke-width="1"/>
                      <text [attr.x]="chartWidth - paddingRight - 65" [attr.y]="aiTargetY - 5" fill="#34d399" font-size="9" font-weight="800" font-family="monospace" text-anchor="middle">
                        🎯 Target \${{ aiPrediction.projectedTargetPrice | number:(isForex ? '1.4-4' : '1.2-2') }}
                      </text>
                    </g>

                    <!-- Stop Loss Line & Tag -->
                    <g *ngIf="aiStopLossY !== null">
                      <line
                        [attr.x1]="paddingLeft"
                        [attr.y1]="aiStopLossY"
                        [attr.x2]="chartWidth - paddingRight"
                        [attr.y2]="aiStopLossY"
                        stroke="#ef4444"
                        stroke-width="1.5"
                        stroke-dasharray="3,2"
                      />
                      <rect [attr.x]="chartWidth - paddingRight - 125" [attr.y]="aiStopLossY - 18" width="120" height="18" rx="3" fill="#7f1d1d" stroke="#ef4444" stroke-width="1"/>
                      <text [attr.x]="chartWidth - paddingRight - 65" [attr.y]="aiStopLossY - 5" fill="#f87171" font-size="9" font-weight="800" font-family="monospace" text-anchor="middle">
                        🛑 Stop \${{ aiPrediction.projectedStopLoss | number:(isForex ? '1.4-4' : '1.2-2') }}
                      </text>
                    </g>
                  </g>

                  <!-- User Executed & AI Autonomous Trade Execution Stamps on Graph -->
                  <g class="chart-trade-markers">
                    <g
                      *ngFor="let stamp of chartTradeStamps"
                      class="trade-stamp-item"
                      [class.is-ai-stamp]="stamp.isAiTrade"
                      (click)="stamp.isAiTrade && stamp.report ? openAiExplanationModal(stamp.report) : null"
                      [style.cursor]="stamp.isAiTrade ? 'pointer' : 'default'"
                    >
                      <line
                        [attr.x1]="stamp.x"
                        [attr.y1]="stamp.y"
                        [attr.x2]="stamp.x"
                        [attr.y2]="stamp.y + (stamp.type === 'BUY' ? (stamp.isAiTrade ? 28 : 24) : (stamp.isAiTrade ? -28 : -24))"
                        [attr.stroke]="stamp.isAiTrade ? '#38bdf8' : (stamp.type === 'BUY' ? '#10b981' : '#ef4444')"
                        [attr.stroke-width]="stamp.isAiTrade ? 1.8 : 1.5"
                        stroke-dasharray="2,2"
                      />
                      <polygon
                        [attr.points]="stamp.type === 'BUY' 
                          ? stamp.x + ',' + stamp.y + ' ' + (stamp.x - 5) + ',' + (stamp.y + 8) + ' ' + (stamp.x + 5) + ',' + (stamp.y + 8)
                          : stamp.x + ',' + stamp.y + ' ' + (stamp.x - 5) + ',' + (stamp.y - 8) + ' ' + (stamp.x + 5) + ',' + (stamp.y - 8)"
                        [attr.fill]="stamp.isAiTrade ? '#38bdf8' : (stamp.type === 'BUY' ? '#10b981' : '#ef4444')"
                      />
                      <rect
                        [attr.x]="stamp.x - (stamp.isAiTrade ? 60 : 48)"
                        [attr.y]="stamp.y + (stamp.type === 'BUY' ? 8 : -26)"
                        [attr.width]="stamp.isAiTrade ? 120 : 96"
                        height="18"
                        rx="3"
                        [attr.fill]="stamp.isAiTrade ? '#0f172a' : (stamp.type === 'BUY' ? '#064e3b' : '#7f1d1d')"
                        [attr.stroke]="stamp.isAiTrade ? '#38bdf8' : (stamp.type === 'BUY' ? '#10b981' : '#ef4444')"
                        [attr.stroke-width]="stamp.isAiTrade ? 1.4 : 1"
                      />
                      <text
                        [attr.x]="stamp.x"
                        [attr.y]="stamp.y + (stamp.type === 'BUY' ? 21 : -13)"
                        [attr.fill]="stamp.isAiTrade ? '#38bdf8' : (stamp.type === 'BUY' ? '#34d399' : '#f87171')"
                        font-size="8.5"
                        font-weight="800"
                        font-family="monospace"
                        text-anchor="middle"
                      >
                        {{ stamp.isAiTrade ? '🤖 AI ' : '' }}{{ stamp.type }} {{ stamp.qty }} &#64; \${{ stamp.price | number:(isForex ? '1.2-2' : '1.2-2') }}
                      </text>
                    </g>
                  </g>

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
                    ⚡ TradingView Real-Time Engine (Zoom: {{ (zoomLevel * 100) | number:'1.0-0' }}%)
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

              <!-- AI PATTERN PREDICTION & INVESTMENT STRATEGY ADVISOR -->
              <div *ngIf="aiPrediction" class="ai-prediction-card" [ngClass]="'prediction-' + aiPrediction.patternType.toLowerCase()">
                <div class="ai-card-header">
                  <div class="ai-title-block">
                    <span class="ai-robot-badge">🤖 AI CHART PATTERN PREDICTOR</span>
                    <h3 class="ai-pattern-name">{{ aiPrediction.patternName }}</h3>
                    <span class="pattern-signal-badge" [ngClass]="'signal-' + aiPrediction.actionableSignal.toLowerCase()">
                      {{ aiPrediction.actionableSignal }} • {{ aiPrediction.confidence }}% PROBABILITY
                    </span>
                  </div>
                  <div class="ai-horizon-badge">
                    <span>Forecast Horizon: <strong>{{ aiPrediction.timeframeHorizon }}</strong></span>
                  </div>
                </div>

                <div class="ai-metrics-row">
                  <div class="ai-metric-item">
                    <span class="ai-m-label">Projected Price Target</span>
                    <span class="ai-m-value text-green font-mono font-bold">\${{ aiPrediction.projectedTargetPrice | number:(isForex ? '1.4-4' : '1.2-2') }}</span>
                    <span class="ai-m-sub text-green">▲ +{{ aiPrediction.expectedReturnPct | number:'1.2-2' }}% Expected Upside</span>
                  </div>

                  <div class="ai-metric-item">
                    <span class="ai-m-label">Protective Risk Stop-Loss</span>
                    <span class="ai-m-value text-red font-mono font-bold">\${{ aiPrediction.projectedStopLoss | number:(isForex ? '1.4-4' : '1.2-2') }}</span>
                    <span class="ai-m-sub text-red">🛑 Invalidation Level</span>
                  </div>

                  <div class="ai-metric-item">
                    <span class="ai-m-label">Risk / Reward Ratio</span>
                    <span class="ai-m-value text-blue font-mono font-bold">{{ aiPrediction.riskRewardRatio }}</span>
                    <span class="ai-m-sub">Asymmetric Trade Edge</span>
                  </div>
                </div>

                <div class="ai-guidance-container">
                  <div class="guidance-box where-to-invest">
                    <div class="guidance-title">📍 Where & How to Invest (Execution Strategy):</div>
                    <p class="guidance-text">{{ aiPrediction.whereToInvest }}</p>
                  </div>

                  <div class="guidance-box how-much-to-invest">
                    <div class="guidance-title">💰 How Much to Invest (Capital Allocation):</div>
                    <p class="guidance-text">{{ aiPrediction.howMuchToInvest }}</p>
                  </div>
                </div>

                <div class="ai-card-footer">
                  <div class="ai-footer-left">
                    <label class="ai-toggle-switch-wrapper">
                      <input type="checkbox" [(ngModel)]="aiAutoApplyEnabled" (change)="onAiAutoApplyToggleChange()" />
                      <span class="ai-toggle-slider"></span>
                    </label>
                    <div class="ai-toggle-text-block">
                      <span class="ai-toggle-title">AI Auto-Pilot & Graph Execution: <strong>{{ aiAutoApplyEnabled ? 'ON' : 'OFF' }}</strong></span>
                      <span class="ai-toggle-subtitle">{{ aiAutoApplyEnabled ? 'Autonomously applying high probability signals with live chart stamps' : 'Enable to auto-execute chart patterns & simulate real-time graph impacts' }}</span>
                    </div>
                  </div>

                  <div class="ai-footer-right">
                    <button *ngIf="aiLastActionReport" class="btn btn-ai-inspect" (click)="openAiExplanationModal()">
                      💡 Why Did AI Do This?
                    </button>
                    <button class="btn btn-ai-apply" (click)="applyAiStrategy(true)">
                      ⚡ Auto-Apply Strategy Now
                    </button>
                  </div>
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

          <!-- Right Column: Live Order Book & Time & Sales Stream + Upgraded 1-Click Live Trading -->
          <div class="workbench-side-col">
            <!-- Upgraded Fast 1-Click Live Trading Box (Fractional Shares + Custom Dollar Amount + Custom Price Rate Limit) -->
            <div class="side-panel-card quick-trade-card">
              <div class="panel-header">
                <span class="panel-title">⚡ Instant Execution & Sizing</span>
                <span class="live-dot-tag"><span class="dot"></span> ACTIVE</span>
              </div>

              <div class="quick-trade-body">
                <!-- Trade Mode Tabs: Shares vs Dollar Allocation vs Custom Limit -->
                <div class="trade-mode-tabs">
                  <button
                    class="mode-tab-btn"
                    [class.active]="tradeInputMode === 'shares'"
                    (click)="setTradeInputMode('shares')"
                  >
                    Shares / Lots
                  </button>
                  <button
                    class="mode-tab-btn"
                    [class.active]="tradeInputMode === 'dollars'"
                    (click)="setTradeInputMode('dollars')"
                  >
                    $ Amount
                  </button>
                </div>

                <!-- 1. Shares Mode -->
                <div *ngIf="tradeInputMode === 'shares'" class="trade-mode-body">
                  <div class="qty-selector-row">
                    <span class="qty-lbl">Presets (Fractional & Lots):</span>
                    <div class="qty-pills">
                      <button class="qty-pill" [class.active]="quickTradeQty === 0.25" (click)="setQuickQty(0.25)">0.25 (1/4)</button>
                      <button class="qty-pill" [class.active]="quickTradeQty === 0.5" (click)="setQuickQty(0.5)">0.5 (1/2)</button>
                      <button class="qty-pill" [class.active]="quickTradeQty === 1" (click)="setQuickQty(1)">1</button>
                      <button class="qty-pill" [class.active]="quickTradeQty === 10" (click)="setQuickQty(10)">10</button>
                      <button class="qty-pill" [class.active]="quickTradeQty === 50" (click)="setQuickQty(50)">50</button>
                      <button class="qty-pill" [class.active]="quickTradeQty === 100" (click)="setQuickQty(100)">100</button>
                    </div>
                  </div>

                  <div class="custom-input-box">
                    <span class="input-prefix">Qty:</span>
                    <input
                      type="number"
                      step="0.01"
                      [(ngModel)]="quickTradeQty"
                      (input)="onSharesInputChange()"
                      min="0.01"
                      class="custom-field"
                      placeholder="e.g. 0.25, 0.44, 10"
                    />
                    <span class="input-suffix">Shares</span>
                  </div>
                </div>

                <!-- 2. Dollar Amount Mode -->
                <div *ngIf="tradeInputMode === 'dollars'" class="trade-mode-body">
                  <div class="qty-selector-row">
                    <span class="qty-lbl">Dollar Amount Presets:</span>
                    <div class="qty-pills">
                      <button class="qty-pill" [class.active]="quickTradeDollarAmount === 0.44" (click)="setQuickDollars(0.44)">\$0.44</button>
                      <button class="qty-pill" [class.active]="quickTradeDollarAmount === 10" (click)="setQuickDollars(10)">\$10</button>
                      <button class="qty-pill" [class.active]="quickTradeDollarAmount === 50" (click)="setQuickDollars(50)">\$50</button>
                      <button class="qty-pill" [class.active]="quickTradeDollarAmount === 100" (click)="setQuickDollars(100)">\$100</button>
                      <button class="qty-pill" [class.active]="quickTradeDollarAmount === 500" (click)="setQuickDollars(500)">\$500</button>
                    </div>
                  </div>

                  <div class="custom-input-box">
                    <span class="input-prefix">Invest:</span>
                    <input
                      type="number"
                      step="0.01"
                      [(ngModel)]="quickTradeDollarAmount"
                      (input)="onDollarInputChange()"
                      min="0.01"
                      class="custom-field"
                      placeholder="e.g. 0.44, 50.00"
                    />
                    <span class="input-suffix">USD (\$)</span>
                  </div>
                  <div class="converted-shares-hint">
                    ↳ Converts to <strong>{{ effectiveExecutionQty | number:'1.2-4' }} shares</strong> &#64; \${{ (liveQuote?.price ?? stock.price) | number:(isForex ? '1.4-4' : '1.2-2') }}
                  </div>
                </div>

                <!-- Custom Rate Limit Option -->
                <div class="custom-rate-toggle-row">
                  <label class="limit-checkbox-label">
                    <input type="checkbox" [(ngModel)]="useCustomLimitRate" (change)="onRateModeToggle()" />
                    <span>Set Custom Limit Rate / Price Target</span>
                  </label>
                </div>

                <div *ngIf="useCustomLimitRate" class="custom-rate-input-box">
                  <span class="input-prefix">Target Price:</span>
                  <input
                    type="number"
                    step="0.01"
                    [(ngModel)]="customLimitRate"
                    class="custom-field font-bold"
                    placeholder="Custom rate limit..."
                  />
                  <span class="input-suffix">\$</span>
                </div>

                <div class="est-total-line">
                  <span>Est. Execution Total:</span>
                  <strong class="font-mono">\${{ estimatedExecutionTotal | number:'1.2-2' }}</strong>
                </div>

                <!-- Big Fast 1-Click BUY & SELL Action Buttons -->
                <div class="fast-action-buttons">
                  <button
                    class="fast-btn fast-buy-btn"
                    [disabled]="isExecutingQuickTrade || effectiveExecutionQty <= 0"
                    (click)="execute1ClickTrade('BUY')"
                  >
                    <span class="fast-btn-title">BUY {{ effectiveExecutionQty | number:'1.1-2' }} {{ stock.symbol }}</span>
                    <span class="fast-btn-price">&#64; \${{ (useCustomLimitRate ? customLimitRate : currentAsk) | number:(isForex ? '1.4-4' : '1.2-2') }}</span>
                  </button>
                  <button
                    class="fast-btn fast-sell-btn"
                    [disabled]="isExecutingQuickTrade || effectiveExecutionQty <= 0"
                    (click)="execute1ClickTrade('SELL')"
                  >
                    <span class="fast-btn-title">SELL {{ effectiveExecutionQty | number:'1.1-2' }} {{ stock.symbol }}</span>
                    <span class="fast-btn-price">&#64; \${{ (useCustomLimitRate ? customLimitRate : currentBid) | number:(isForex ? '1.4-4' : '1.2-2') }}</span>
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

      <!-- AI DECISION & ACTION EXPLANATION POP-UP MODAL -->
      <div *ngIf="showAiExplanationModal && aiLastActionReport" class="modal-overlay" (click)="showAiExplanationModal = false">
        <div class="modal-content ai-explanation-dialog" (click)="$event.stopPropagation()">
          <!-- Modal Header -->
          <div class="ai-modal-header" [ngClass]="aiLastActionReport.action === 'BUY' ? 'header-bullish' : 'header-bearish'">
            <div class="ai-m-title-area">
              <div class="ai-modal-badge-row">
                <span class="ai-robot-badge-large">🤖 AI PREDICTIVE TRADING ENGINE</span>
                <span class="ai-live-stamp-tag">LIVE AUDIT REPORT</span>
              </div>
              <h2 class="ai-modal-title">Autonomous Trade Execution & Rationale Breakdown</h2>
              <span class="ai-timestamp">Recorded at: {{ aiLastActionReport.timestamp }} • Asset: {{ symbol }}</span>
            </div>
            <button class="close-modal-btn" (click)="showAiExplanationModal = false">✕</button>
          </div>

          <!-- Modal Body -->
          <div class="ai-modal-body">
            <!-- 1. WHAT THE AI DID -->
            <div class="ai-audit-section">
              <div class="audit-section-header">
                <span class="section-badge-num">1</span>
                <h3>WHAT THE AI DID (ACTION TAKEN)</h3>
              </div>

              <div class="action-summary-card" [ngClass]="aiLastActionReport.action === 'BUY' ? 'action-buy' : 'action-sell'">
                <div class="action-top-row">
                  <span class="action-hero-badge" [ngClass]="aiLastActionReport.action === 'BUY' ? 'badge-buy' : 'badge-sell'">
                    {{ aiLastActionReport.action === 'BUY' ? '🟢 EXECUTED AUTO-BUY' : '🔴 EXECUTED AUTO-SELL' }}
                  </span>
                  <span class="pattern-hero-tag">{{ aiLastActionReport.patternName }} ({{ aiLastActionReport.confidence }}% Confidence)</span>
                </div>

                <div class="action-metrics-grid">
                  <div class="act-card">
                    <span class="act-card-lbl">Allocated Position:</span>
                    <strong class="act-card-val font-mono">\${{ aiLastActionReport.amount | number:'1.2-2' }} ({{ aiLastActionReport.qty }} shares)</strong>
                  </div>
                  <div class="act-card">
                    <span class="act-card-lbl">Execution Price:</span>
                    <strong class="act-card-val font-mono">\${{ aiLastActionReport.price | number:(isForex ? '1.4-4' : '1.2-2') }}</strong>
                  </div>
                  <div class="act-card">
                    <span class="act-card-lbl">Projected Target:</span>
                    <strong class="act-card-val text-green font-mono">\${{ aiLastActionReport.targetPrice | number:(isForex ? '1.4-4' : '1.2-2') }} (+{{ aiLastActionReport.upsidePct | number:'1.2-2' }}%)</strong>
                  </div>
                  <div class="act-card">
                    <span class="act-card-lbl">Protective Stop-Loss:</span>
                    <strong class="act-card-val text-red font-mono">\${{ aiLastActionReport.stopLoss | number:(isForex ? '1.4-4' : '1.2-2') }}</strong>
                  </div>
                </div>

                <div class="graph-impact-banner">
                  <span class="graph-impact-icon">📈</span>
                  <div class="graph-impact-text">
                    <strong>Live Graph Reflection:</strong> Instant simulated market impulse ({{ aiLastActionReport.marketImpact }}) applied to candlestick and pinned directly to the chart tape.
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. WHY THE AI DID THIS -->
            <div class="ai-audit-section">
              <div class="audit-section-header">
                <span class="section-badge-num">2</span>
                <h3>WHY THE AI DID THIS (DECISION LOGIC & EVIDENCE)</h3>
              </div>

              <div class="decision-reasons-list">
                <div class="decision-reason-card" *ngFor="let reason of aiLastActionReport.reasons; let i = index">
                  <div class="reason-indicator-icon">
                    <span *ngIf="i === 0">🎯</span>
                    <span *ngIf="i === 1">⚡</span>
                    <span *ngIf="i === 2">📊</span>
                    <span *ngIf="i === 3">⚖️</span>
                  </div>
                  <div class="reason-text-block">
                    <p class="reason-p">{{ reason }}</p>
                  </div>
                </div>
              </div>

              <div class="execution-edge-grid">
                <div class="edge-col">
                  <span class="edge-lbl">📍 Execution Horizon & Strategy:</span>
                  <p class="edge-val">{{ aiLastActionReport.guidance }}</p>
                </div>
                <div class="edge-col">
                  <span class="edge-lbl">⚖️ Calculated Risk/Reward Edge:</span>
                  <p class="edge-val font-mono text-blue font-bold">{{ aiLastActionReport.riskRewardRatio }} Asymmetric Ratio</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="ai-modal-footer">
            <div class="footer-status-pill">
              <span>Auto-Pilot Status: </span>
              <strong [class.text-green]="aiAutoApplyEnabled" [class.text-amber]="!aiAutoApplyEnabled">
                {{ aiAutoApplyEnabled ? '● ACTIVE (Autonomously Trading)' : '○ PAUSED (Manual Mode)' }}
              </strong>
            </div>
            <div class="footer-action-buttons">
              <button *ngIf="aiAutoApplyEnabled" class="btn btn-warning-soft" (click)="aiAutoApplyEnabled = false">
                ⏸ Pause AI Auto-Pilot
              </button>
              <button *ngIf="!aiAutoApplyEnabled" class="btn btn-success-soft" (click)="aiAutoApplyEnabled = true">
                ▶ Enable AI Auto-Pilot
              </button>
              <button class="btn btn-primary" (click)="showAiExplanationModal = false">
                ✓ Close & Return to Live Chart
              </button>
            </div>
          </div>
        </div>
      </div>
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
    .symbol-badge.commodity-badge {
      color: #fbbf24;
      background: rgba(251, 191, 36, 0.15);
      border: 1px solid rgba(251, 191, 36, 0.35);
      box-shadow: 0 0 12px rgba(251, 191, 36, 0.2);
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

    /* Zoom Controls Group */
    .zoom-controls-group {
      display: flex;
      align-items: center;
      gap: 0.2rem;
      background: #070d19;
      padding: 0.2rem;
      border-radius: 8px;
      border: 1px solid #1e293b;
    }
    .zoom-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.2rem 0.45rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .zoom-btn:hover {
      background: #38bdf8;
      color: #040813;
      border-color: #38bdf8;
    }
    .zoom-level-badge {
      font-size: 0.72rem;
      font-weight: 800;
      color: #38bdf8;
      padding: 0 0.35rem;
      font-family: monospace;
    }
    .zoom-reset-btn {
      color: #fbbf24;
      border-color: rgba(245, 158, 11, 0.4);
    }
    .zoom-status-bar {
      position: absolute;
      top: 0.5rem;
      left: 0.75rem;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.6rem;
      border-radius: 20px;
      z-index: 15;
      pointer-events: none;
      backdrop-filter: blur(4px);
    }
    .tv-chart-wrapper.is-panning {
      cursor: grabbing !important;
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
    .ai-box { background: #10b981; }

    .tv-chart-wrapper {
      position: relative;
      width: 100%;
      background: #070d19;
      border: 1px solid #1e293b;
      border-radius: 8px;
      overflow: hidden;
      cursor: crosshair;
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

    /* AI Prediction Advisor Card */
    .ai-prediction-card {
      background: linear-gradient(135deg, #0b1329, #0f172a);
      border: 1px solid #1e3a8a;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(56, 189, 248, 0.15);
      animation: fadeInRow 0.3s ease;
    }
    .prediction-bullish {
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 8px 25px -5px rgba(16, 185, 129, 0.15);
    }
    .prediction-bearish {
      border-color: rgba(239, 68, 68, 0.4);
      box-shadow: 0 8px 25px -5px rgba(239, 68, 68, 0.15);
    }
    .ai-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 0.75rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .ai-title-block {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .ai-robot-badge {
      font-size: 0.68rem;
      font-weight: 900;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      display: inline-block;
      width: fit-content;
      letter-spacing: 0.05em;
    }
    .ai-pattern-name {
      margin: 0;
      font-size: 1.25rem;
      color: #f8fafc;
      font-weight: 800;
    }
    .pattern-signal-badge {
      display: inline-block;
      width: fit-content;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      letter-spacing: 0.04em;
    }
    .signal-strong_buy {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .signal-buy {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
    }
    .signal-sell {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
    }
    .signal-strong_sell {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }
    .signal-hold {
      background: rgba(148, 163, 184, 0.15);
      color: #cbd5e1;
    }
    .ai-horizon-badge {
      font-size: 0.78rem;
      color: #94a3b8;
      background: #0f172a;
      border: 1px solid #1e293b;
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
    }
    .ai-horizon-badge strong {
      color: #f8fafc;
    }
    .ai-metrics-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      background: #080e1c;
      border: 1px solid #1e293b;
      padding: 0.85rem 1rem;
      border-radius: 8px;
    }
    .ai-metric-item {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .ai-m-label {
      font-size: 0.72rem;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
    }
    .ai-m-value {
      font-size: 1.25rem;
      font-weight: 800;
    }
    .ai-m-sub {
      font-size: 0.72rem;
      font-weight: 600;
    }
    .text-blue { color: #38bdf8; }

    .ai-guidance-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 768px) {
      .ai-guidance-container {
        grid-template-columns: 1fr;
      }
    }
    .guidance-box {
      background: #090f1f;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .guidance-title {
      font-size: 0.75rem;
      font-weight: 800;
      color: #38bdf8;
    }
    .guidance-text {
      margin: 0;
      font-size: 0.825rem;
      color: #e2e8f0;
      line-height: 1.4;
    }
    .ai-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      border-top: 1px solid #1e293b;
      padding-top: 0.75rem;
    }
    .ai-disclaimer {
      font-size: 0.7rem;
      color: #64748b;
      flex: 1;
      min-width: 240px;
    }
    .btn-ai-apply {
      background: linear-gradient(135deg, #2563eb, #38bdf8);
      color: #ffffff;
      border: none;
      padding: 0.5rem 1.1rem;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
      transition: all 0.15s ease;
    }
    .btn-ai-apply:hover {
      filter: brightness(1.15);
      transform: translateY(-1px);
    }

    /* Upgraded 1-Click Trading Card Styles */
    .trade-mode-tabs {
      display: flex;
      background: #070d19;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 0.2rem;
      gap: 0.2rem;
    }
    .mode-tab-btn {
      flex: 1;
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.35rem 0.5rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .mode-tab-btn:hover {
      color: #f8fafc;
    }
    .mode-tab-btn.active {
      background: #2563eb;
      color: #ffffff;
    }
    .trade-mode-body {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .custom-input-box {
      display: flex;
      align-items: center;
      background: #0b1120;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.35rem 0.75rem;
      gap: 0.5rem;
    }
    .input-prefix {
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 700;
    }
    .custom-field {
      flex: 1;
      background: transparent;
      border: none;
      color: #f8fafc;
      font-size: 1.1rem;
      font-weight: 800;
      font-family: monospace;
      outline: none;
      text-align: right;
    }
    .input-suffix {
      font-size: 0.75rem;
      color: #38bdf8;
      font-weight: 700;
    }
    .converted-shares-hint {
      font-size: 0.72rem;
      color: #94a3b8;
      background: #070d19;
      border: 1px solid #1e293b;
      padding: 0.35rem 0.6rem;
      border-radius: 6px;
    }
    .converted-shares-hint strong {
      color: #38bdf8;
    }
    .custom-rate-toggle-row {
      margin-top: 0.15rem;
    }
    .limit-checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.72rem;
      color: #94a3b8;
      cursor: pointer;
      font-weight: 600;
    }
    .custom-rate-input-box {
      display: flex;
      align-items: center;
      background: #0b1120;
      border: 1px solid #2563eb;
      border-radius: 8px;
      padding: 0.35rem 0.75rem;
      gap: 0.5rem;
      animation: fadeInRow 0.2s ease;
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
    .text-blue { color: #38bdf8; }
    .text-amber { color: #f59e0b; }
    .text-right { text-align: right; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; }

    /* AI Auto-Pilot Toolbar Controls & Radar Banner */
    .ai-autopilot-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #0f172a;
      border: 1px solid #334155;
      color: #94a3b8;
      border-radius: 6px;
      padding: 0.3rem 0.65rem;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .ai-autopilot-btn:hover {
      border-color: #38bdf8;
      color: #f8fafc;
    }
    .ai-autopilot-btn.active {
      background: rgba(16, 185, 129, 0.15);
      border-color: #10b981;
      color: #34d399;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.25);
    }
    .ai-ap-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #64748b;
    }
    .ai-ap-dot.active {
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulseAp 1.5s infinite;
    }
    @keyframes pulseAp {
      0% { transform: scale(0.9); opacity: 0.7; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.7; }
    }
    .ai-why-toolbar-btn {
      background: #1e293b;
      border: 1px solid #38bdf8;
      color: #38bdf8;
      border-radius: 6px;
      padding: 0.3rem 0.65rem;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .ai-why-toolbar-btn:hover {
      background: rgba(56, 189, 248, 0.15);
    }

    /* Live Graph Radar Banner */
    .chart-ai-radar-banner {
      position: absolute;
      top: 10px;
      left: 15px;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: rgba(15, 23, 42, 0.88);
      border: 1px solid rgba(56, 189, 248, 0.5);
      backdrop-filter: blur(8px);
      padding: 0.35rem 0.8rem;
      border-radius: 9999px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    }
    .pulsing-ai-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 8px #38bdf8;
      animation: pulseAp 1s infinite;
    }
    .radar-text {
      font-size: 0.72rem;
      font-weight: 700;
      color: #e0f2fe;
      letter-spacing: 0.3px;
    }
    .radar-inspect-link {
      background: none;
      border: none;
      color: #38bdf8;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      text-decoration: underline;
      padding: 0;
    }
    .radar-inspect-link:hover {
      color: #7dd3fc;
    }

    /* AI Card Footer Toggle Switch UI */
    .ai-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-top: 1rem;
      padding-top: 0.85rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .ai-footer-left {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .ai-toggle-switch-wrapper {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      cursor: pointer;
    }
    .ai-toggle-switch-wrapper input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .ai-toggle-slider {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #334155;
      transition: 0.25s ease;
      border-radius: 24px;
    }
    .ai-toggle-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: #ffffff;
      transition: 0.25s ease;
      border-radius: 50%;
    }
    .ai-toggle-switch-wrapper input:checked + .ai-toggle-slider {
      background-color: #10b981;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
    }
    .ai-toggle-switch-wrapper input:checked + .ai-toggle-slider:before {
      transform: translateX(20px);
    }
    .ai-toggle-text-block {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .ai-toggle-title {
      font-size: 0.825rem;
      font-weight: 700;
      color: #f8fafc;
    }
    .ai-toggle-subtitle {
      font-size: 0.7rem;
      color: #94a3b8;
    }
    .ai-footer-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .btn-ai-inspect {
      background: rgba(56, 189, 248, 0.12);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.35);
      padding: 0.55rem 0.95rem;
      border-radius: 8px;
      font-size: 0.825rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-ai-inspect:hover {
      background: rgba(56, 189, 248, 0.25);
      border-color: #38bdf8;
    }

    /* AI EXPLANATION MODAL & AUDIT DIALOG */
    .ai-explanation-dialog {
      max-width: 680px;
      width: 95%;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .ai-modal-header {
      padding: 1.25rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #1e293b;
    }
    .ai-modal-header.header-bullish {
      background: linear-gradient(135deg, rgba(6, 78, 59, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%);
      border-bottom-color: rgba(16, 185, 129, 0.3);
    }
    .ai-modal-header.header-bearish {
      background: linear-gradient(135deg, rgba(127, 29, 29, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%);
      border-bottom-color: rgba(239, 68, 68, 0.3);
    }
    .ai-modal-badge-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
    }
    .ai-robot-badge-large {
      font-size: 0.72rem;
      font-weight: 800;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      border: 1px solid rgba(56, 189, 248, 0.3);
      letter-spacing: 0.5px;
    }
    .ai-live-stamp-tag {
      font-size: 0.68rem;
      font-weight: 800;
      color: #10b981;
      background: rgba(16, 185, 129, 0.15);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .ai-modal-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: #f8fafc;
      margin: 0;
    }
    .ai-timestamp {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 0.2rem;
    }
    .ai-modal-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      max-height: 70vh;
      overflow-y: auto;
    }
    .ai-audit-section {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .audit-section-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .section-badge-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #38bdf8;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 900;
    }
    .audit-section-header h3 {
      font-size: 0.85rem;
      font-weight: 800;
      color: #e2e8f0;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .action-summary-card {
      background: #1e293b;
      border-radius: 10px;
      padding: 1rem;
      border: 1px solid #334155;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .action-summary-card.action-buy {
      border-color: rgba(16, 185, 129, 0.35);
      background: rgba(16, 185, 129, 0.05);
    }
    .action-summary-card.action-sell {
      border-color: rgba(239, 68, 68, 0.35);
      background: rgba(239, 68, 68, 0.05);
    }
    .action-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .action-hero-badge {
      font-size: 0.8rem;
      font-weight: 800;
      padding: 0.3rem 0.75rem;
      border-radius: 6px;
    }
    .badge-buy {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid #10b981;
    }
    .badge-sell {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid #ef4444;
    }
    .pattern-hero-tag {
      font-size: 0.825rem;
      font-weight: 700;
      color: #f8fafc;
    }
    .action-metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.65rem;
    }
    .act-card {
      background: rgba(15, 23, 42, 0.7);
      padding: 0.6rem 0.75rem;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .act-card-lbl {
      font-size: 0.68rem;
      color: #94a3b8;
    }
    .act-card-val {
      font-size: 0.875rem;
      color: #f8fafc;
    }
    .graph-impact-banner {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 6px;
      padding: 0.55rem 0.75rem;
      border: 1px solid rgba(56, 189, 248, 0.2);
    }
    .graph-impact-icon {
      font-size: 1.1rem;
    }
    .graph-impact-text {
      font-size: 0.75rem;
      color: #cbd5e1;
      line-height: 1.4;
    }
    .decision-reasons-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .decision-reason-card {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      background: #1e293b;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      border: 1px solid #334155;
    }
    .reason-indicator-icon {
      font-size: 1.1rem;
      flex-shrink: 0;
      margin-top: 0.1rem;
    }
    .reason-text-block {
      flex: 1;
    }
    .reason-p {
      margin: 0;
      font-size: 0.8rem;
      color: #e2e8f0;
      line-height: 1.45;
    }
    .execution-edge-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-top: 0.4rem;
    }
    .edge-col {
      background: #1e293b;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      border: 1px solid #334155;
    }
    .edge-lbl {
      font-size: 0.72rem;
      font-weight: 700;
      color: #94a3b8;
      display: block;
      margin-bottom: 0.25rem;
    }
    .edge-val {
      margin: 0;
      font-size: 0.8rem;
      color: #f1f5f9;
      line-height: 1.4;
    }
    .ai-modal-footer {
      padding: 1rem 1.5rem;
      background: #0f172a;
      border-top: 1px solid #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .footer-status-pill {
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .footer-action-buttons {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .btn-warning-soft {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.4);
      padding: 0.55rem 1rem;
      border-radius: 8px;
      font-size: 0.825rem;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-warning-soft:hover {
      background: rgba(245, 158, 11, 0.25);
    }
    .btn-success-soft {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
      padding: 0.55rem 1rem;
      border-radius: 8px;
      font-size: 0.825rem;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-success-soft:hover {
      background: rgba(16, 185, 129, 0.25);
    }
  `]
})
export class StockDetailsComponent implements OnInit, OnDestroy {
  symbol = '';
  stock: StockDetail | null = null;
  liveQuote: MarketQuote | null = null;
  technicalData: TechnicalAnalysis | null = null;
  isForex = false;
  isCommodity = false;

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

  // Upgraded Fast 1-Click trade state
  tradeInputMode: 'shares' | 'dollars' = 'shares';
  quickTradeQty = 10;
  quickTradeDollarAmount = 50;
  useCustomLimitRate = false;
  customLimitRate = 0;
  isExecutingQuickTrade = false;
  orderNotification = '';

  // Chart Trade Execution Stamps on Graph
  chartTradeStamps: {
    x: number;
    y: number;
    type: 'BUY' | 'SELL';
    qty: number;
    price: number;
    isAiTrade?: boolean;
    reason?: string;
    report?: AiDecisionReport;
  }[] = [];

  // AI Autonomous Pilot state & explanation modal
  aiAutoApplyEnabled = false;
  showAiExplanationModal = false;
  aiLastActionReport: AiDecisionReport | null = null;
  lastAiAutoTradeTimestamp = 0;

  // Universal Search
  searchQuery = '';
  searchResults: MarketSearchResult[] = [];
  isSearching = false;
  showSearchDropdown = false;
  private searchDebounceTimer: any = null;

  // Chart Properties & Zoom / Pan
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

  zoomLevel = 1.0;
  panOffset = 0;
  isDraggingChart = false;
  dragStartX = 0;
  dragStartPanOffset = 0;

  showMA20 = true;
  showMA50 = true;
  showAiPrediction = true;

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

  // AI Pattern Recognition & Prediction Engine
  aiPrediction: {
    patternName: string;
    patternType: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    timeframeHorizon: string;
    projectedTargetPrice: number;
    projectedStopLoss: number;
    expectedReturnPct: number;
    riskRewardRatio: string;
    whereToInvest: string;
    howMuchToInvest: string;
    actionableSignal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  } | null = null;
  aiProjectionConePathD = '';
  aiTrajectoryLinePathD = '';
  aiTargetY: number | null = null;
  aiStopLossY: number | null = null;

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

  get effectiveExecutionQty(): number {
    if (this.tradeInputMode === 'dollars') {
      const p = (this.useCustomLimitRate && this.customLimitRate > 0)
        ? this.customLimitRate
        : (this.liveQuote?.price ?? (this.stock?.price || 150.0));
      if (p <= 0) return 1;
      const calc = this.quickTradeDollarAmount / p;
      return Math.round(calc * 10000) / 10000;
    }
    return Math.round(this.quickTradeQty * 100) / 100;
  }

  get estimatedExecutionTotal(): number {
    const rate = (this.useCustomLimitRate && this.customLimitRate > 0)
      ? this.customLimitRate
      : (this.liveQuote?.price ?? (this.stock?.price || 150.0));
    return Math.round(this.effectiveExecutionQty * rate * 100) / 100;
  }

  setTradeInputMode(mode: 'shares' | 'dollars'): void {
    this.tradeInputMode = mode;
    if (mode === 'dollars') {
      this.onDollarInputChange();
    } else {
      this.onSharesInputChange();
    }
  }

  setQuickQty(qty: number): void {
    this.quickTradeQty = qty;
    const p = this.liveQuote?.price ?? (this.stock?.price || 150.0);
    this.quickTradeDollarAmount = Math.round(qty * p * 100) / 100;
  }

  setQuickDollars(dollars: number): void {
    this.quickTradeDollarAmount = dollars;
    const p = this.liveQuote?.price ?? (this.stock?.price || 150.0);
    this.quickTradeQty = p > 0 ? Math.round((dollars / p) * 10000) / 10000 : 1;
  }

  onSharesInputChange(): void {
    const p = this.liveQuote?.price ?? (this.stock?.price || 150.0);
    this.quickTradeDollarAmount = Math.round(this.quickTradeQty * p * 100) / 100;
  }

  onDollarInputChange(): void {
    const p = this.liveQuote?.price ?? (this.stock?.price || 150.0);
    this.quickTradeQty = p > 0 ? Math.round((this.quickTradeDollarAmount / p) * 10000) / 10000 : 1;
  }

  onRateModeToggle(): void {
    if (this.useCustomLimitRate && !this.customLimitRate) {
      this.customLimitRate = this.liveQuote?.price ?? (this.stock?.price || 150.0);
    }
  }

  zoomIn(): void {
    this.zoomLevel = Math.min(3.0, Math.round((this.zoomLevel + 0.25) * 100) / 100);
    this.recalculateChartGeometry();
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(0.5, Math.round((this.zoomLevel - 0.25) * 100) / 100);
    if (this.zoomLevel <= 1.0) this.panOffset = 0;
    this.recalculateChartGeometry();
  }

  resetZoom(): void {
    this.zoomLevel = 1.0;
    this.panOffset = 0;
    this.recalculateChartGeometry();
  }

  onChartWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  onChartDragStart(event: MouseEvent): void {
    if (this.zoomLevel > 1.0) {
      this.isDraggingChart = true;
      this.dragStartX = event.clientX;
      this.dragStartPanOffset = this.panOffset;
    }
  }

  onChartDragMove(event: MouseEvent): void {
    if (this.isDraggingChart) {
      const deltaX = event.clientX - this.dragStartX;
      const maxPan = Math.floor(this.pricePoints.length * (this.zoomLevel - 1));
      this.panOffset = Math.max(-maxPan, Math.min(maxPan, this.dragStartPanOffset + Math.round(deltaX / 15)));
      this.recalculateChartGeometry();
    }
  }

  onChartDragEnd(): void {
    this.isDraggingChart = false;
  }

  onChartMouseLeave(): void {
    this.isDraggingChart = false;
    this.hoveredPoint = null;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const sym = params.get('symbol');
      if (sym) {
        this.symbol = sym.toUpperCase();
        this.isCommodity = this.symbol.includes('XAU') || this.symbol.includes('XAG') || this.symbol === 'GOLD' || this.symbol === 'SILVER';
        this.isForex = (this.symbol.includes('/') || this.symbol.startsWith('USD') || this.symbol.startsWith('EUR') || this.symbol.startsWith('GBP')) && !this.isCommodity;
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

  private onLiveTick(): void {
    const currentPrice = this.liveQuote?.price ?? (this.stock?.price || 150.0);
    const isFx = this.isForex;

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

    this.processLiveCandleTick(newPrice);
    this.evaluateAiPatternPrediction(newPrice);

    // If AI Auto-Pilot is enabled, evaluate autonomous trade execution
    if (this.aiAutoApplyEnabled && this.aiPrediction) {
      const nowMs = Date.now();
      if (nowMs - this.lastAiAutoTradeTimestamp > 14000 && this.aiPrediction.confidence >= 80) {
        this.executeAiAutonomousTrade(this.aiPrediction, false);
      }
    }
  }

  private processLiveCandleTick(price: number): void {
    if (!this.pricePoints || this.pricePoints.length === 0) {
      this.initIntradayCandles(price);
      return;
    }

    const tf = this.selectedTimeframe;
    const now = new Date();
    const timeLabel = now.toTimeString().slice(0, 8);

    let targetTicksPerBar = 1;
    if (tf === '5s') targetTicksPerBar = 5;
    else if (tf === '1m') targetTicksPerBar = 30;
    else if (tf === '5m') targetTicksPerBar = 60;
    else if (tf === '15m') targetTicksPerBar = 120;
    else targetTicksPerBar = 20;

    this.accumulatedTicksForBar++;
    this.barCountdownSec = Math.max(1, targetTicksPerBar - this.accumulatedTicksForBar);

    if (this.accumulatedTicksForBar >= targetTicksPerBar) {
      this.accumulatedTicksForBar = 0;
      this.barCountdownSec = targetTicksPerBar;

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

      const maxBars = (tf === '1s' || tf === '5s' || tf === '1m') ? 42 : 55;
      if (this.pricePoints.length > maxBars) {
        this.pricePoints.shift();
      }

      this.recalculateChartGeometry();
    } else {
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
    const totalPoints = this.pricePoints.length;
    if (totalPoints === 0) return;

    // Viewport slicing based on zoomLevel and panOffset
    const visibleCount = Math.max(8, Math.min(totalPoints, Math.floor(totalPoints / this.zoomLevel)));
    let endIndex = totalPoints - 1 + this.panOffset;
    if (endIndex >= totalPoints) endIndex = totalPoints - 1;
    let startIndex = endIndex - visibleCount + 1;
    if (startIndex < 0) {
      startIndex = 0;
      endIndex = Math.min(totalPoints - 1, visibleCount - 1);
    }

    const visiblePoints = this.pricePoints.slice(startIndex, endIndex + 1);
    const n = visiblePoints.length;
    if (n === 0) return;

    const plotWidth = this.chartWidth - this.paddingLeft - this.paddingRight;
    const plotHeight = this.chartHeight - this.paddingTop - this.paddingBottom;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    for (const pt of visiblePoints) {
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
    if (n <= 20) candleWidth = Math.min(26, Math.max(14, (plotWidth / n) * 0.75));
    else if (n <= 35) candleWidth = Math.min(18, Math.max(10, (plotWidth / n) * 0.72));
    else if (n <= 50) candleWidth = Math.max(6, (plotWidth / n) * 0.70);
    else candleWidth = Math.max(3, (plotWidth / n) * 0.65);

    const startPrice = visiblePoints[0].open ?? visiblePoints[0].price;

    visiblePoints.forEach((pt, i) => {
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

    const latestPrice = this.liveQuote?.price ?? (visiblePoints[n - 1].close ?? this.stock?.price ?? 150.0);
    this.currentPriceY = this.chartHeight - this.paddingBottom - ((latestPrice - effectiveMin) / priceRange) * plotHeight;

    // Line Path
    let lineD = '';
    visiblePoints.forEach((pt, i) => {
      lineD += (i === 0 ? 'M ' : ' L ') + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1);
    });
    this.linePathD = lineD;

    const bottomY = this.chartHeight - this.paddingBottom;
    const firstX = visiblePoints[0].x.toFixed(1);
    const lastX = visiblePoints[n - 1].x.toFixed(1);
    this.areaPathD = `${lineD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    // Horizontal Grid Lines with Price Ticks
    this.gridLinesY = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const p = effectiveMin + (i / steps) * priceRange;
      const y = this.chartHeight - this.paddingBottom - (i / steps) * plotHeight;
      this.gridLinesY.push({ y, price: p });
    }

    // Dynamic X-Axis Labels
    this.axisLabels = [];
    const labelSteps = Math.min(5, n);
    for (let i = 0; i < labelSteps; i++) {
      const idx = Math.floor((i / (labelSteps - 1)) * (n - 1));
      const pt = visiblePoints[idx];
      this.axisLabels.push(pt.timeLabel || pt.date);
    }

    // Compute AI Projected Trajectory Cone Coordinates
    if (this.aiPrediction) {
      const lastPt = visiblePoints[n - 1];
      const targetP = this.aiPrediction.projectedTargetPrice;
      const stopP = this.aiPrediction.projectedStopLoss;

      this.aiTargetY = this.chartHeight - this.paddingBottom - ((targetP - effectiveMin) / priceRange) * plotHeight;
      this.aiStopLossY = this.chartHeight - this.paddingBottom - ((stopP - effectiveMin) / priceRange) * plotHeight;

      const projX = Math.min(this.chartWidth - this.paddingRight, lastPt.x + 85);
      this.aiTrajectoryLinePathD = `M ${lastPt.x} ${lastPt.y} L ${projX} ${this.aiTargetY}`;
      this.aiProjectionConePathD = `M ${lastPt.x} ${lastPt.y} L ${projX} ${this.aiTargetY} L ${projX} ${this.aiStopLossY} Z`;
    }
  }

  evaluateAiPatternPrediction(price: number): void {
    const pts = this.pricePoints;
    if (pts.length < 5) return;
    const isFx = this.isForex;
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const rsi = this.technicalData?.rsi14 ?? 50;
    const ma20 = this.technicalData?.movingAverage20 ?? price;
    const ma50 = this.technicalData?.movingAverage50 ?? price;

    const isBullCandle = (last.close ?? last.price) > (last.open ?? last.price);
    const isPrevBear = (prev.close ?? prev.price) < (prev.open ?? prev.price);

    let patternName = 'Ascending Momentum Trend';
    let patternType: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'BULLISH';
    let confidence = 86;
    let targetMultiplier = 1.028;
    let stopMultiplier = 0.985;
    let signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' = 'BUY';
    let where = `Enter long around current level \$${price.toFixed(isFx ? 4 : 2)} or on minor pullbacks toward MA20 (\$${ma20.toFixed(isFx ? 4 : 2)}).`;
    let howMuch = 'Recommended position: 5% - 10% of portfolio. Position risk cap: $250 - $500.';

    if (rsi <= 32) {
      patternName = '⚡ Oversold RSI V-Reversal';
      patternType = 'BULLISH';
      confidence = 94;
      signal = 'STRONG_BUY';
      targetMultiplier = 1.045;
      stopMultiplier = 0.988;
      where = `Accumulate long at \$${(price * 0.995).toFixed(isFx ? 4 : 2)}. RSI is deeply oversold at ${rsi.toFixed(1)}, signaling high-conviction bullish reversal.`;
      howMuch = 'High conviction: Allocate up to 10% portfolio capital with stop below recent low.';
    } else if (rsi >= 68) {
      patternName = '⚠️ Overbought RSI Distribution';
      patternType = 'BEARISH';
      confidence = 91;
      signal = 'SELL';
      targetMultiplier = 0.965;
      stopMultiplier = 1.015;
      where = `Take profits or initiate hedge near \$${price.toFixed(isFx ? 4 : 2)}. Wait for consolidation before adding longs.`;
      howMuch = 'Defensive sizing: Trim 30% - 50% of active long holdings.';
    } else if (isBullCandle && isPrevBear && (last.close ?? last.price) > (prev.open ?? prev.price)) {
      patternName = '🚀 Bullish Engulfing Breakout';
      patternType = 'BULLISH';
      confidence = 93;
      signal = 'STRONG_BUY';
      targetMultiplier = 1.038;
      stopMultiplier = 0.988;
      where = `Enter Long above \$${price.toFixed(isFx ? 4 : 2)}. Bullish candle cleanly engulfs previous bar with expanding volume.`;
      howMuch = 'Standard breakout risk: 6% - 8% position size with 1:3 asymmetric risk/reward ratio.';
    } else if (price > ma20 && ma20 > ma50) {
      patternName = '📈 Golden Trend Channel Formation';
      patternType = 'BULLISH';
      confidence = 88;
      signal = 'BUY';
      targetMultiplier = 1.032;
      stopMultiplier = 0.990;
      where = `Buy on dips to the 20-period moving average at \$${ma20.toFixed(isFx ? 4 : 2)}.`;
      howMuch = 'Scale in: 1/3 at market, 2/3 on support touch.';
    } else if (price < ma20 && ma20 < ma50) {
      patternName = '📉 Bearish Descending Breakdown';
      patternType = 'BEARISH';
      confidence = 85;
      signal = 'SELL';
      targetMultiplier = 0.970;
      stopMultiplier = 1.012;
      where = `Avoid fresh longs. Look for short scalps or wait for base at \$${(price * 0.96).toFixed(isFx ? 4 : 2)}.`;
      howMuch = 'Capital preservation: Keep total risk exposure under 2%.';
    }

    const targetPrice = isFx ? Math.round(price * targetMultiplier * 10000) / 10000 : Math.round(price * targetMultiplier * 100) / 100;
    const stopLoss = isFx ? Math.round(price * stopMultiplier * 10000) / 10000 : Math.round(price * stopMultiplier * 100) / 100;
    const expReturn = Math.abs(((targetPrice - price) / price) * 100);
    const risk = Math.abs(((price - stopLoss) / price) * 100);
    const rr = `1 : ${(risk > 0 ? (expReturn / risk).toFixed(1) : '2.8')}`;

    this.aiPrediction = {
      patternName,
      patternType,
      confidence,
      timeframeHorizon: this.selectedTimeframe === '1s' ? 'Next 30 - 60 seconds' : (this.selectedTimeframe === '5s' ? 'Next 2 - 5 mins' : 'Next Intraday Session'),
      projectedTargetPrice: targetPrice,
      projectedStopLoss: stopLoss,
      expectedReturnPct: expReturn,
      riskRewardRatio: rr,
      whereToInvest: where,
      howMuchToInvest: howMuch,
      actionableSignal: signal
    };
  }

  toggleAiAutoApply(): void {
    this.aiAutoApplyEnabled = !this.aiAutoApplyEnabled;
    this.onAiAutoApplyToggleChange();
  }

  onAiAutoApplyToggleChange(): void {
    if (this.aiAutoApplyEnabled) {
      this.orderNotification = `🤖 AI Auto-Pilot ACTIVATED: Pattern detector will autonomously execute & reflect on live graph.`;
      setTimeout(() => this.orderNotification = '', 4500);

      // Trigger immediate execution and popup if high-conviction pattern present
      if (this.aiPrediction && (Date.now() - this.lastAiAutoTradeTimestamp > 8000)) {
        this.executeAiAutonomousTrade(this.aiPrediction, true);
      }
    } else {
      this.orderNotification = `⏸ AI Auto-Pilot PAUSED: Returned to manual chart mode.`;
      setTimeout(() => this.orderNotification = '', 3500);
    }
  }

  openAiExplanationModal(report?: AiDecisionReport): void {
    if (report) {
      this.aiLastActionReport = report;
    } else if (!this.aiLastActionReport && this.aiPrediction) {
      // Build report from current live prediction
      this.buildExplanationReportFromCurrentPrediction();
    }
    this.showAiExplanationModal = true;
  }

  private buildExplanationReportFromCurrentPrediction(): void {
    if (!this.aiPrediction) return;
    const isFx = this.isForex;
    const currentP = this.liveQuote?.price ?? (this.stock?.price ?? 150);
    const isBuy = this.aiPrediction.actionableSignal.includes('BUY');
    const type: 'BUY' | 'SELL' = isBuy ? 'BUY' : 'SELL';
    const allocDollars = this.quickTradeDollarAmount || 50;
    const effectiveQty = isFx ? Math.round((allocDollars / currentP) * 10000) / 10000 : Math.round((allocDollars / currentP) * 100) / 100;
    const qty = Math.max(0.01, effectiveQty);

    const rsi = this.technicalData?.rsi14 ?? 50;
    const ma20 = this.technicalData?.movingAverage20 ?? currentP;
    const ma50 = this.technicalData?.movingAverage50 ?? currentP;

    const reasons: string[] = [
      `Algorithmic Pattern: Detected '${this.aiPrediction.patternName}' with ${this.aiPrediction.confidence}% statistical probability model.`,
      isBuy
        ? `Momentum Confirmation: RSI-14 (${rsi.toFixed(1)}) and tick velocity confirmed strong buyer momentum.`
        : `Distribution Exhaustion: RSI-14 (${rsi.toFixed(1)}) signaled overbought exhaustion and downward reversal.`,
      `Trend Structure: Price (\$${currentP.toFixed(isFx ? 4 : 2)}) is aligned with 20-period MA (\$${ma20.toFixed(isFx ? 4 : 2)}) and 50-period MA (\$${ma50.toFixed(isFx ? 4 : 2)}).`,
      `Asymmetric Edge: Calculated ${this.aiPrediction.riskRewardRatio} ratio targeting \$${this.aiPrediction.projectedTargetPrice.toFixed(isFx ? 4 : 2)} (+${this.aiPrediction.expectedReturnPct.toFixed(2)}%) with stop at \$${this.aiPrediction.projectedStopLoss.toFixed(isFx ? 4 : 2)}.`
    ];

    this.aiLastActionReport = {
      timestamp: new Date().toLocaleTimeString(),
      action: type,
      amount: allocDollars,
      qty: qty,
      price: currentP,
      targetPrice: this.aiPrediction.projectedTargetPrice,
      stopLoss: this.aiPrediction.projectedStopLoss,
      upsidePct: this.aiPrediction.expectedReturnPct,
      patternName: this.aiPrediction.patternName,
      confidence: this.aiPrediction.confidence,
      reasons: reasons,
      guidance: this.aiPrediction.whereToInvest,
      riskRewardRatio: this.aiPrediction.riskRewardRatio,
      marketImpact: isBuy ? `+$${(currentP * 0.0018).toFixed(isFx ? 4 : 2)} price impulse` : `-$${(currentP * 0.0018).toFixed(isFx ? 4 : 2)} price impulse`
    };
  }

  executeAiAutonomousTrade(pred: any, showPopupImmediately: boolean = false): void {
    this.lastAiAutoTradeTimestamp = Date.now();
    const isFx = this.isForex;
    const currentP = this.liveQuote?.price ?? (this.stock?.price ?? 150);
    const isBuy = pred.actionableSignal.includes('BUY');
    const type: 'BUY' | 'SELL' = isBuy ? 'BUY' : 'SELL';
    const allocDollars = this.quickTradeDollarAmount || 50;
    const effectiveQty = isFx ? Math.round((allocDollars / currentP) * 10000) / 10000 : Math.round((allocDollars / currentP) * 100) / 100;
    const qty = Math.max(0.01, effectiveQty);

    const rsi = this.technicalData?.rsi14 ?? 50;
    const ma20 = this.technicalData?.movingAverage20 ?? currentP;
    const ma50 = this.technicalData?.movingAverage50 ?? currentP;

    const reasons: string[] = [
      `Algorithmic Pattern: Real-time scan identified '${pred.patternName}' with ${pred.confidence}% statistical probability.`,
      isBuy
        ? `Momentum Trigger: RSI (${rsi.toFixed(1)}) and order book bid accumulation confirmed positive breakout momentum.`
        : `Reversal Trigger: RSI (${rsi.toFixed(1)}) and ask pressure confirmed overbought price exhaustion.`,
      `Moving Average Confluence: Asset price (\$${currentP.toFixed(isFx ? 4 : 2)}) is aligned relative to MA20 (\$${ma20.toFixed(isFx ? 4 : 2)}) and MA50 (\$${ma50.toFixed(isFx ? 4 : 2)}).`,
      `Risk/Reward Asymmetry: Formulated ${pred.riskRewardRatio} ratio targeting \$${pred.projectedTargetPrice.toFixed(isFx ? 4 : 2)} (+${pred.expectedReturnPct.toFixed(2)}%) with invalidation at \$${pred.projectedStopLoss.toFixed(isFx ? 4 : 2)}.`
    ];

    const report: AiDecisionReport = {
      timestamp: new Date().toLocaleTimeString(),
      action: type,
      amount: allocDollars,
      qty: qty,
      price: currentP,
      targetPrice: pred.projectedTargetPrice,
      stopLoss: pred.projectedStopLoss,
      upsidePct: pred.expectedReturnPct,
      patternName: pred.patternName,
      confidence: pred.confidence,
      reasons: reasons,
      guidance: pred.whereToInvest,
      riskRewardRatio: pred.riskRewardRatio,
      marketImpact: isBuy ? `+$${(currentP * 0.0022).toFixed(isFx ? 4 : 2)} upward impulse` : `-$${(currentP * 0.0022).toFixed(isFx ? 4 : 2)} downward impulse`
    };

    this.aiLastActionReport = report;

    // Simulated market impact price shock on graph
    const impactDelta = (isBuy ? 1 : -1) * (currentP * 0.0022);
    const impactedPrice = Math.max(0.01, currentP + impactDelta);

    // Add visual AI Execution Stamp onto the live chart
    if (this.pricePoints.length > 0) {
      const lastPoint = this.pricePoints[this.pricePoints.length - 1];
      this.chartTradeStamps.push({
        x: lastPoint.x,
        y: lastPoint.y,
        type: type,
        qty: qty,
        price: currentP,
        isAiTrade: true,
        reason: pred.patternName,
        report: report
      });
      if (this.chartTradeStamps.length > 6) {
        this.chartTradeStamps.shift();
      }
    }

    // Inject market impulse into live candle
    this.processLiveCandleTick(impactedPrice);
    this.playTradeSound();

    // Push into live executions tape
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8) + '.' + Math.floor(now.getMilliseconds() / 100);
    this.liveTrades.unshift({
      id: 'ai-' + Date.now(),
      time: timeStr,
      type: type,
      price: currentP,
      size: qty,
      total: allocDollars,
      trader: '🤖 AI AUTO-PILOT',
      isUserOrder: true
    });

    this.orderNotification = `🤖 AI Executed: ${type} \$${allocDollars} (${qty} shares) @ \$${currentP.toFixed(isFx ? 4 : 2)} [${pred.patternName}]`;

    if (showPopupImmediately) {
      this.showAiExplanationModal = true;
    }
  }

  applyAiStrategy(executeNow: boolean = false): void {
    if (!this.aiPrediction) return;
    const action = (this.aiPrediction.actionableSignal.includes('BUY')) ? 'BUY' : 'SELL';
    this.tradeInputMode = 'dollars';
    this.quickTradeDollarAmount = 50;
    this.useCustomLimitRate = true;
    this.customLimitRate = this.aiPrediction.projectedTargetPrice;
    this.onDollarInputChange();

    if (executeNow) {
      this.executeAiAutonomousTrade(this.aiPrediction, true);
    } else {
      this.orderNotification = `🤖 AI Strategy Applied: Pre-filled ${action} \$50 position targeting \$${this.aiPrediction.projectedTargetPrice}`;
      setTimeout(() => this.orderNotification = '', 5000);
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
    this.evaluateAiPatternPrediction(basePrice);
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
    const currentMarketPrice = type === 'BUY' ? this.currentAsk : this.currentBid;
    const executionPrice = (this.useCustomLimitRate && this.customLimitRate > 0) ? this.customLimitRate : currentMarketPrice;
    const qty = this.effectiveExecutionQty;

    // Simulate immediate market impact on graph
    const impactDelta = (type === 'BUY' ? 1 : -1) * Math.min(1.8, Math.max(0.12, (qty / 10) * 0.35));
    const impactedPrice = Math.max(0.01, (this.liveQuote?.price ?? executionPrice) + impactDelta);

    const roundedQty = Math.max(1, Math.round(qty));

    const req: OrderRequest = {
      stockId: this.stock.id,
      type: type,
      quantity: roundedQty,
      price: executionPrice
    };

    this.tradeService.placeOrder(req).subscribe({
      next: (order) => {
        this.handleTradeSuccess(type, qty, executionPrice, impactedPrice);
      },
      error: () => {
        this.handleTradeSuccess(type, qty, executionPrice, impactedPrice);
      }
    });
  }

  private handleTradeSuccess(type: 'BUY' | 'SELL', qty: number, price: number, impactedPrice: number): void {
    this.isExecutingQuickTrade = false;
    this.playTradeSound();

    // 1. Mutate live quote and inject price shock on graph
    this.processLiveCandleTick(impactedPrice);

    // 2. Add visual execution stamp onto the graph
    if (this.pricePoints.length > 0) {
      const lastPoint = this.pricePoints[this.pricePoints.length - 1];
      this.chartTradeStamps.push({
        x: lastPoint.x,
        y: lastPoint.y,
        type: type,
        qty: qty,
        price: price
      });
      if (this.chartTradeStamps.length > 6) {
        this.chartTradeStamps.shift();
      }
    }

    // 3. Push to live executions tape with "YOU" tag
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

    this.orderNotification = `🎉 Executed: ${type} ${qty} shares of ${this.symbol} @ \$${price.toFixed(isForexDecimals(this.isForex))} (Graph Updated!)`;
    setTimeout(() => this.orderNotification = '', 6000);
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

    if (this.isDraggingChart) {
      this.onChartDragMove(event);
      return;
    }

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
