import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Stock, StockDetail } from '../../models/stock.model';

@Injectable({
  providedIn: 'root'
})
export class MarketService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStocks(): Observable<Stock[]> {
    return this.http.get<Stock[]>(`${this.apiUrl}/stocks`);
  }

  getStockDetail(symbol: string): Observable<StockDetail> {
    return this.http.get<StockDetail>(`${this.apiUrl}/stocks/${symbol}`);
  }
}
