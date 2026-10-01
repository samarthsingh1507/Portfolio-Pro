import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MarketQuote, MarketSearchResult } from '../../models/market-quote.model';

@Injectable({
  providedIn: 'root'
})
export class MarketDataService {
  private readonly baseUrl = `${environment.apiUrl}/market`;

  constructor(private http: HttpClient) {}

  /**
   * Fetches real-time market quote for a single symbol from Spring Boot backend.
   * Endpoint: GET /api/market/quote/{symbol}
   *
   * @param symbol Stock ticker (e.g. AAPL)
   */
  getQuote(symbol: string): Observable<MarketQuote> {
    if (!symbol || !symbol.trim()) {
      return throwError(() => new Error('Symbol parameter must not be empty'));
    }

    const cleanSymbol = symbol.trim().toUpperCase();
    return this.http.get<MarketQuote>(`${this.baseUrl}/quote/${cleanSymbol}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Fetches real-time market quotes for multiple symbols in batch.
   * Endpoint: GET /api/market/quotes?symbols=AAPL,MSFT,TSLA
   *
   * @param symbols Array of ticker symbols
   */
  getQuotes(symbols: string[]): Observable<MarketQuote[]> {
    if (!symbols || symbols.length === 0) {
      return throwError(() => new Error('Symbols list must contain at least one symbol'));
    }

    const cleanList = symbols
      .filter(s => s && s.trim().length > 0)
      .map(s => s.trim().toUpperCase());

    if (cleanList.length === 0) {
      return throwError(() => new Error('No valid symbols provided'));
    }

    return this.http.get<MarketQuote[]>(`${this.baseUrl}/quotes`, {
      params: { symbols: cleanList.join(',') }
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Searches for market tickers and securities.
   * Endpoint: GET /api/market/search?query=...
   *
   * @param query Search query string
   */
  search(query: string): Observable<MarketSearchResult[]> {
    if (!query || !query.trim()) {
      return throwError(() => new Error('Search query must not be empty'));
    }

    return this.http.get<MarketSearchResult[]>(`${this.baseUrl}/search`, {
      params: { query: query.trim() }
    }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Market data temporarily unavailable';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Network error: ${error.error.message}`;
    } else if (error.status === 0) {
      // Network error or timeout (status 0)
      errorMessage = 'Market data service unreachable. Please verify backend connection.';
    } else if (error.status === 404) {
      errorMessage = error.error?.message || 'Stock symbol not found';
    } else if (error.status === 429) {
      errorMessage = 'Market data rate limit reached. Please wait a moment and retry.';
    } else if (error.status === 503 || error.status === 504 || error.status === 502) {
      errorMessage = 'Market data provider temporarily unavailable. Please retry shortly.';
    } else if (error.status >= 500) {
      errorMessage = error.error?.message || 'Market data service error. Please try again.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
}
