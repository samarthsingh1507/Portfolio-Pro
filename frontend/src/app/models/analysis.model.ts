export interface PriceHistoryItem {
  date: string;
  closePrice: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
}

export interface TechnicalAnalysis {
  symbol: string;
  currentPrice: number;
  movingAverage20: number | null;
  movingAverage50: number | null;
  rsi14: number | null;
  priceHistory: PriceHistoryItem[];
}

export interface FundamentalAnalysis {
  symbol: string;
  companyName: string;
  sector: string;
  marketCap: number;
  eps: number;
  peRatio: number;
}
