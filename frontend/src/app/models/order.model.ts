export interface OrderRequest {
  stockId: number;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
}

export interface OrderResponse {
  orderId: number;
  stockId: number;
  symbol: string;
  companyName: string;
  type: string;
  quantity: number;
  price: number;
  totalValue: number;
  status: string;
  createdAt: string;
}
