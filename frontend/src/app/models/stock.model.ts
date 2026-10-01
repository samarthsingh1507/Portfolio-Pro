export interface Stock {
  id: number;
  symbol: string;
  companyName: string;
  price: number;
  sector: string;
  marketCap: number;
  eps: number;
  peRatio: number;
}

export type StockResponse = Stock;

export interface StockDetail extends Stock {
  inWatchlist: boolean;
}

export interface WatchlistItem {
  id: number;
  stockId: number;
  symbol: string;
  companyName: string;
  price: number;
  sector: string;
  peRatio: number;
  addedAt: string;
}
