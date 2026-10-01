import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Portfolio, PortfolioAnalytics } from '../../models/portfolio.model';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPortfolio(): Observable<Portfolio> {
    return this.http.get<Portfolio>(`${this.apiUrl}/portfolio`);
  }

  getAnalytics(): Observable<PortfolioAnalytics> {
    return this.http.get<PortfolioAnalytics>(`${this.apiUrl}/portfolio/analytics`);
  }
}
