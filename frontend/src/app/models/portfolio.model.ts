export interface Holding {
  stockId: number;
  symbol: string;
  companyName: string;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number | null;
  investedValue: number;
  currentValue: number | null;
  profitLoss: number | null;
  profitLossPercent: number | null;
  // New fields from PortfolioValuationService
  marketDataAvailable?: boolean;
  marketStatus?: string;
  quoteTimestamp?: string;
}

export interface Portfolio {
  totalInvested: number;
  currentValue: number | null;
  totalProfitLoss: number | null;
  profitLossPercent: number | null;
  holdings: Holding[];
  // New fields from PortfolioValuationService
  availableCash?: number;
  holdingsValue?: number | null;
  marketDataAvailable?: boolean;
  valuationStatus?: string;
}

export interface AllocationItem {
  symbol: string;
  percentage: number;
  companyName?: string;
  currentValue?: number;
}

export interface PortfolioAnalytics {
  totalInvested: number;
  currentValue: number;
  totalProfitLoss: number;
  profitLossPercent: number;
  numberOfHoldings: number;
  allocation: AllocationItem[];
  diversification: string;
  riskIndicator: string;
}
