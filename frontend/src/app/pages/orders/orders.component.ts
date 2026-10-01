import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TradeService } from '../../core/services/trade.service';
import { OrderResponse } from '../../models/order.model';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="orders-page">
      <div class="orders-header">
        <div>
          <h1>Order History</h1>
          <p class="subtitle">Complete audit log of your executed simulated stock trades</p>
        </div>
        <a routerLink="/market" class="btn btn-primary">
          Explore Market
        </a>
      </div>

      <div *ngIf="isLoading" class="loading-card">
        <p>Loading transaction history...</p>
      </div>

      <div *ngIf="errorMessage" class="alert alert-error">
        {{ errorMessage }}
      </div>

      <div *ngIf="!isLoading && orders.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
            <line x1="2" y1="20" x2="22" y2="20"></line>
          </svg>
        </div>
        <h3>No trades executed yet</h3>
        <p>You haven't placed any simulated BUY or SELL orders yet.</p>
        <a routerLink="/market" class="btn btn-outline">
          <svg class="btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
            <polyline points="16 7 22 7 22 13"></polyline>
          </svg>
          <span>Go to Market to Trade</span>
        </a>
      </div>

      <div *ngIf="!isLoading && orders.length > 0" class="table-card">
        <table class="orders-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Order ID</th>
              <th>Symbol</th>
              <th>Company</th>
              <th class="text-center">Type</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Price</th>
              <th class="text-right">Total Value</th>
              <th class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let order of orders">
              <td class="date-col">{{ order.createdAt | date:'medium' }}</td>
              <td class="id-col">#{{ order.orderId }}</td>
              <td>
                <a [routerLink]="['/market', order.symbol]" class="symbol-badge">
                  {{ order.symbol }}
                </a>
              </td>
              <td class="company-name">{{ order.companyName }}</td>
              <td class="text-center">
                <span class="badge" [ngClass]="order.type === 'BUY' ? 'badge-buy' : 'badge-sell'">
                  {{ order.type }}
                </span>
              </td>
              <td class="text-right font-bold">{{ order.quantity }}</td>
              <td class="text-right">\${{ order.price | number:'1.2-2' }}</td>
              <td class="text-right font-bold">\${{ order.totalValue | number:'1.2-2' }}</td>
              <td class="text-center">
                <span class="badge badge-executed">
                  {{ order.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .orders-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .orders-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 1.25rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .orders-header h1 {
      font-size: 1.85rem;
      color: #f8fafc;
      margin: 0 0 0.25rem 0;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 0.9rem;
      margin: 0;
    }
    .loading-card, .empty-state {
      padding: 3.5rem 1.5rem;
      text-align: center;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      color: #94a3b8;
    }
    .empty-icon {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
    }
    .empty-state h3 {
      color: #f8fafc;
      margin-bottom: 0.5rem;
    }
    .empty-state p {
      margin-bottom: 1.5rem;
    }
    .alert-error {
      background-color: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #f87171;
      padding: 1rem;
      border-radius: 8px;
    }
    .table-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      overflow-x: auto;
    }
    .orders-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .orders-table th {
      background-color: #1e293b;
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.875rem 1.25rem;
    }
    .orders-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #1e293b;
      color: #f1f5f9;
      font-size: 0.95rem;
    }
    .orders-table tr:last-child td {
      border-bottom: none;
    }
    .orders-table tr:hover td {
      background-color: rgba(30, 41, 59, 0.5);
    }
    .date-col {
      color: #94a3b8;
      font-size: 0.875rem;
      white-space: nowrap;
    }
    .id-col {
      color: #64748b;
      font-size: 0.85rem;
      font-family: monospace;
    }
    .symbol-badge {
      display: inline-block;
      background-color: #1e293b;
      color: #38bdf8;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-weight: 700;
      text-decoration: none;
      border: 1px solid #334155;
    }
    .symbol-badge:hover {
      border-color: #38bdf8;
      text-decoration: underline;
    }
    .company-name {
      color: #cbd5e1;
    }
    .text-center {
      text-align: center;
    }
    .text-right {
      text-align: right;
    }
    .font-bold {
      font-weight: 700;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .badge-buy {
      background-color: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .badge-sell {
      background-color: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
    }
    .badge-executed {
      background-color: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #93c5fd;
    }
    .btn {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
    }
    .btn-icon {
      flex-shrink: 0;
    }
    .btn-primary {
      background-color: #2563eb;
      color: #ffffff;
      border: 1px solid #2563eb;
    }
    .btn-primary:hover {
      background-color: #1d4ed8;
    }
    .btn-outline {
      border: 1px solid #334155;
      color: #e2e8f0;
      background: transparent;
    }
    .btn-outline:hover {
      background-color: #1e293b;
      border-color: #38bdf8;
      color: #38bdf8;
    }
  `]
})
export class OrdersComponent implements OnInit {
  orders: OrderResponse[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(private tradeService: TradeService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.tradeService.getOrders().subscribe({
      next: (data) => {
        this.orders = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to load orders history';
      }
    });
  }
}
