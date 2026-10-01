export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  username: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
}
