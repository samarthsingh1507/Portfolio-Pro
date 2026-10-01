import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/user.model';
import { WatchlistItem } from '../../models/stock.model';

@Injectable({
  providedIn: 'root'
})
export class WatchlistService {
  private apiUrl = environment.apiUrl;

  // Signal storing IDs of stocks currently in user's watchlist for instant UI synchronization
  watchedStockIds = signal<Set<number>>(new Set<number>());

  constructor(private http: HttpClient) {}

  getWatchlist(): Observable<WatchlistItem[]> {
    return this.http.get<WatchlistItem[]>(`${this.apiUrl}/watchlist`).pipe(
      tap(items => {
        const idSet = new Set<number>(items.map(i => i.stockId));
        this.watchedStockIds.set(idSet);
      })
    );
  }

  addToWatchlist(stockId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/watchlist/${stockId}`, {}).pipe(
      tap(() => {
        const updated = new Set<number>(this.watchedStockIds());
        updated.add(stockId);
        this.watchedStockIds.set(updated);
      })
    );
  }

  removeFromWatchlist(stockId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/watchlist/${stockId}`).pipe(
      tap(() => {
        const updated = new Set<number>(this.watchedStockIds());
        updated.delete(stockId);
        this.watchedStockIds.set(updated);
      })
    );
  }

  isWatched(stockId: number): boolean {
    return this.watchedStockIds().has(stockId);
  }
}
