import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TradeService } from '../../../core/services/trade.service';
import { OrderResponse } from '../../../models/order.model';

@Component({
  selector: 'app-trade-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="trade-modal">
        <div class="modal-header">
          <div class="header-info">
            <span class="symbol-pill">{{ symbol }}</span>
            <span class="company-sub">{{ companyName }}</span>
          </div>
          <button class="close-btn" (click)="close.emit()">✕</button>
        </div>

        <!-- Success Message -->
        <div *ngIf="lastOrder" class="alert alert-success">
          <div class="success-title">✓ Order Executed Successfully!</div>
          <div class="order-summary">
            <span><strong>{{ lastOrder.type }}</strong> {{ lastOrder.quantity }} shares &#64; \${{ lastOrder.price | number:'1.2-2' }}</span>
            <span>Total: \${{ lastOrder.totalValue | number:'1.2-2' }}</span>
          </div>
          <button class="btn btn-sm btn-primary" (click)="onDone()">Done</button>
        </div>

        <!-- Error Message -->
        <div *ngIf="errorMessage" class="alert alert-error">
          {{ errorMessage }}
        </div>

        <form *ngIf="!lastOrder" (ngSubmit)="onSubmit()" class="trade-form">
          <!-- Buy / Sell Toggle Buttons -->
          <div class="type-toggle">
            <button
              type="button"
              class="toggle-btn buy-btn"
              [class.active]="orderType === 'BUY'"
              (click)="orderType = 'BUY'"
            >
              BUY
            </button>
            <button
              type="button"
              class="toggle-btn sell-btn"
              [class.active]="orderType === 'SELL'"
              (click)="orderType = 'SELL'"
            >
              SELL
            </button>
          </div>

          <div class="form-row">
            <span class="row-label">Order Type</span>
            <span class="row-value font-bold" [ngClass]="orderType === 'BUY' ? 'text-green' : 'text-red'">
              Simulated Market {{ orderType }}
            </span>
          </div>

          <div class="form-row">
            <span class="row-label">Market Price</span>
            <span class="row-value font-bold">\${{ currentPrice | number:'1.2-2' }}</span>
          </div>

          <!-- Quantity Input -->
          <div class="form-group">
            <label for="quantity">Quantity (Shares)</label>
            <div class="quantity-input-wrapper">
              <button type="button" class="stepper-btn" (click)="decrementQuantity()">−</button>
              <input
                type="number"
                id="quantity"
                name="quantity"
                [(ngModel)]="quantity"
                min="1"
                required
                class="quantity-field"
              />
              <button type="button" class="stepper-btn" (click)="incrementQuantity()">+</button>
            </div>
          </div>

          <!-- Estimated Total -->
          <div class="total-card">
            <span class="total-label">Estimated Total</span>
            <span class="total-value">\${{ estimatedTotal | number:'1.2-2' }}</span>
          </div>

          <!-- Actions -->
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" (click)="close.emit()" [disabled]="isSubmitting">
              Cancel
            </button>
            <button
              type="submit"
              class="btn"
              [ngClass]="orderType === 'BUY' ? 'btn-buy-submit' : 'btn-sell-submit'"
              [disabled]="quantity < 1 || isSubmitting"
            >
              <span *ngIf="!isSubmitting">Confirm {{ orderType }} Order</span>
              <span *ngIf="isSubmitting">Executing...</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      padding: 1rem;
    }
    .trade-modal {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 14px;
      width: 100%;
      max-width: 460px;
      padding: 2rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.5);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 1rem;
    }
    .header-info {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
    }
    .symbol-pill {
      background: #1e293b;
      color: #38bdf8;
      border: 1px solid #334155;
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      font-weight: 700;
      font-size: 1.1rem;
    }
    .company-sub {
      color: #94a3b8;
      font-size: 0.9rem;
    }
    .close-btn {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem;
    }
    .close-btn:hover {
      color: #f8fafc;
    }
    .type-toggle {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .toggle-btn {
      padding: 0.65rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      border: 1px solid #334155;
      background: #1e293b;
      color: #94a3b8;
      transition: all 0.15s ease;
    }
    .buy-btn.active {
      background-color: #10b981;
      border-color: #10b981;
      color: #ffffff;
    }
    .sell-btn.active {
      background-color: #ef4444;
      border-color: #ef4444;
      color: #ffffff;
    }
    .form-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      font-size: 0.9rem;
    }
    .row-label {
      color: #94a3b8;
    }
    .row-value {
      color: #f8fafc;
    }
    .font-bold {
      font-weight: 700;
    }
    .text-green {
      color: #34d399;
    }
    .text-red {
      color: #f87171;
    }
    .form-group {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .form-group label {
      color: #cbd5e1;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .quantity-input-wrapper {
      display: flex;
      align-items: center;
      border: 1px solid #334155;
      border-radius: 8px;
      overflow: hidden;
      background: #1e293b;
    }
    .stepper-btn {
      background: #1e293b;
      border: none;
      color: #f8fafc;
      width: 44px;
      height: 42px;
      font-size: 1.25rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stepper-btn:hover {
      background: #334155;
    }
    .quantity-field {
      flex: 1;
      background: transparent;
      border: none;
      text-align: center;
      color: #f8fafc;
      font-size: 1.1rem;
      font-weight: 700;
      outline: none;
      padding: 0.5rem;
    }
    .total-card {
      margin-top: 1.25rem;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .total-label {
      color: #94a3b8;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .total-value {
      font-size: 1.4rem;
      font-weight: 800;
      color: #f8fafc;
    }
    .modal-actions {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
    .btn {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }
    .btn-secondary {
      background: #1e293b;
      border: 1px solid #334155;
      color: #cbd5e1;
    }
    .btn-secondary:hover {
      background: #334155;
    }
    .btn-buy-submit {
      background: #10b981;
      color: #ffffff;
    }
    .btn-buy-submit:hover:not(:disabled) {
      background: #059669;
    }
    .btn-sell-submit {
      background: #ef4444;
      color: #ffffff;
    }
    .btn-sell-submit:hover:not(:disabled) {
      background: #dc2626;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .alert {
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.25rem;
      font-size: 0.875rem;
    }
    .alert-success {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid #10b981;
      color: #34d399;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: center;
      text-align: center;
    }
    .success-title {
      font-weight: 700;
      font-size: 1rem;
    }
    .order-summary {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      color: #e2e8f0;
      font-size: 0.9rem;
    }
    .alert-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #f87171;
    }
    .btn-sm {
      padding: 0.4rem 1rem;
      font-size: 0.85rem;
    }
  `]
})
export class TradeFormComponent implements OnInit {
  @Input() stockId!: number;
  @Input() symbol!: string;
  @Input() companyName!: string;
  @Input() currentPrice!: number;
  @Input() initialType: 'BUY' | 'SELL' = 'BUY';

  @Output() orderPlaced = new EventEmitter<OrderResponse>();
  @Output() close = new EventEmitter<void>();

  orderType: 'BUY' | 'SELL' = 'BUY';
  quantity = 1;
  isSubmitting = false;
  errorMessage = '';
  lastOrder: OrderResponse | null = null;

  constructor(private tradeService: TradeService) {}

  ngOnInit(): void {
    this.orderType = this.initialType || 'BUY';
  }

  get estimatedTotal(): number {
    return (this.quantity || 0) * (this.currentPrice || 0);
  }

  incrementQuantity(): void {
    this.quantity = (this.quantity || 0) + 1;
  }

  decrementQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }

  onSubmit(): void {
    if (this.quantity < 1 || !this.currentPrice) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    this.tradeService.placeOrder({
      stockId: this.stockId,
      type: this.orderType,
      quantity: this.quantity,
      price: this.currentPrice
    }).subscribe({
      next: (order) => {
        this.isSubmitting = false;
        this.lastOrder = order;
        this.orderPlaced.emit(order);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message || 'Trade execution failed';
      }
    });
  }

  onDone(): void {
    this.close.emit();
  }
}
