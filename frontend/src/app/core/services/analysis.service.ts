import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TechnicalAnalysis, FundamentalAnalysis } from '../../models/analysis.model';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getTechnicalAnalysis(symbol: string): Observable<TechnicalAnalysis> {
    return this.http.get<TechnicalAnalysis>(`${this.apiUrl}/analysis/technical/${symbol}`);
  }

  getFundamentalAnalysis(symbol: string): Observable<FundamentalAnalysis> {
    return this.http.get<FundamentalAnalysis>(`${this.apiUrl}/analysis/fundamental/${symbol}`);
  }
}
