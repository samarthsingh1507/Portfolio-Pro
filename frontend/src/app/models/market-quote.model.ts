/**
 * TypeScript interface representing standard Market Quote response from Spring Boot backend.
 * Matches backend com.portfoliopro.dto.market.MarketQuoteDto.
 */
export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  marketStatus: 'OPEN' | 'CLOSED' | string;
}

/**
 * TypeScript interface representing search result item from Spring Boot backend.
 * Matches backend com.portfoliopro.dto.market.MarketSearchResultDto.
 */
export interface MarketSearchResult {
  symbol: string;
  description: string;
  type: string;
  exchange: string;
}

/**
 * UI helper state for rendering loading, success, or error conditions for a quote.
 */
export interface MarketQuoteState {
  quote: MarketQuote | null;
  isLoading: boolean;
  error: string | null;
}
