import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MarketDataService } from './market-data.service';
import { MarketQuote, MarketSearchResult } from '../../models/market-quote.model';
import { environment } from '../../../environments/environment';

describe('MarketDataService', () => {
  let service: MarketDataService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/market`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MarketDataService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(MarketDataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch a successful market quote for AAPL', () => {
    const mockQuote: MarketQuote = {
      symbol: 'AAPL',
      price: 338.40,
      change: -2.67,
      changePercent: -0.78,
      timestamp: '2026-09-28T13:30:00Z',
      marketStatus: 'CLOSED'
    };

    service.getQuote('AAPL').subscribe({
      next: (quote) => {
        expect(quote).toEqual(mockQuote);
        expect(quote.symbol).toBe('AAPL');
        expect(quote.price).toBe(338.40);
        expect(quote.marketStatus).toBe('CLOSED');
      }
    });

    const req = httpMock.expectOne(`${baseUrl}/quote/AAPL`);
    expect(req.request.method).toBe('GET');
    req.flush(mockQuote);
  });

  it('should handle HTTP 404 symbol not found error', () => {
    service.getQuote('INVALIDXYZ').subscribe({
      next: () => fail('expected an error, not quote'),
      error: (error: Error) => {
        expect(error.message).toContain('Stock symbol not found');
      }
    });

    const req = httpMock.expectOne(`${baseUrl}/quote/INVALIDXYZ`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'Stock symbol not found: INVALIDXYZ' }, { status: 404, statusText: 'Not Found' });
  });

  it('should handle HTTP 429 rate limit exceeded error', () => {
    service.getQuote('TSLA').subscribe({
      next: () => fail('expected an error, not quote'),
      error: (error: Error) => {
        expect(error.message).toContain('rate limit reached');
      }
    });

    const req = httpMock.expectOne(`${baseUrl}/quote/TSLA`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'Rate limit exceeded' }, { status: 429, statusText: 'Too Many Requests' });
  });

  it('should handle HTTP 503 provider failure / timeout error', () => {
    service.getQuote('NVDA').subscribe({
      next: () => fail('expected an error, not quote'),
      error: (error: Error) => {
        expect(error.message).toContain('Market data provider temporarily unavailable');
      }
    });

    const req = httpMock.expectOne(`${baseUrl}/quote/NVDA`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'Twelve Data provider error' }, { status: 503, statusText: 'Service Unavailable' });
  });

  it('should reject empty symbol without making HTTP request', () => {
    service.getQuote('').subscribe({
      next: () => fail('expected an error'),
      error: (error: Error) => {
        expect(error.message).toContain('Symbol parameter must not be empty');
      }
    });

    httpMock.expectNone(`${baseUrl}/quote/`);
  });

  it('should fetch batch quotes for multiple symbols', () => {
    const mockQuotes: MarketQuote[] = [
      {
        symbol: 'AAPL',
        price: 338.40,
        change: -2.67,
        changePercent: -0.78,
        timestamp: '2026-09-28T13:30:00Z',
        marketStatus: 'CLOSED'
      },
      {
        symbol: 'MSFT',
        price: 415.50,
        change: 3.20,
        changePercent: 0.77,
        timestamp: '2026-09-28T13:30:00Z',
        marketStatus: 'CLOSED'
      }
    ];

    service.getQuotes(['AAPL', 'MSFT']).subscribe({
      next: (quotes) => {
        expect(quotes.length).toBe(2);
        expect(quotes[0].symbol).toBe('AAPL');
        expect(quotes[1].symbol).toBe('MSFT');
      }
    });

    const req = httpMock.expectOne(`${baseUrl}/quotes?symbols=AAPL,MSFT`);
    expect(req.request.method).toBe('GET');
    req.flush(mockQuotes);
  });

  it('should search securities via /search endpoint', () => {
    const mockResults: MarketSearchResult[] = [
      {
        symbol: 'AAPL',
        description: 'Apple Inc',
        type: 'Common Stock',
        exchange: 'NASDAQ'
      }
    ];

    service.search('Apple').subscribe({
      next: (results) => {
        expect(results.length).toBe(1);
        expect(results[0].symbol).toBe('AAPL');
        expect(results[0].description).toBe('Apple Inc');
      }
    });

    const req = httpMock.expectOne(`${baseUrl}/search?query=Apple`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResults);
  });

  it('should handle network connection failure or timeout (status 0)', () => {
    service.getQuote('AMZN').subscribe({
      next: () => fail('expected an error, not quote'),
      error: (error: Error) => {
        expect(error.message).toContain('Market data service unreachable');
      }
    });

    const req = httpMock.expectOne(`${baseUrl}/quote/AMZN`);
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
  });

  it('should handle internal server error (HTTP 500)', () => {
    service.getQuote('GOOGL').subscribe({
      next: () => fail('expected an error, not quote'),
      error: (error: Error) => {
        expect(error.message).toContain('Market data service error');
      }
    });

    const req = httpMock.expectOne(`${baseUrl}/quote/GOOGL`);
    req.flush({}, { status: 500, statusText: 'Internal Server Error' });
  });
});
