import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">📈</div>
          <h2>Welcome Back</h2>
          <p>Log in to access your simulated stock portfolio</p>
        </div>

        <div *ngIf="successMessage" class="alert alert-success">
          {{ successMessage }}
        </div>

        <div *ngIf="errorMessage" class="alert alert-error">
          {{ errorMessage }}
        </div>

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm" class="auth-form">
          <div class="form-group">
            <label for="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              [(ngModel)]="username"
              #usernameCtrl="ngModel"
              required
              class="form-control"
              placeholder="e.g. demo"
              autocomplete="username"
            />
            <div *ngIf="usernameCtrl.invalid && (usernameCtrl.dirty || usernameCtrl.touched)" class="field-error">
              Username is required
            </div>
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              [(ngModel)]="password"
              #passwordCtrl="ngModel"
              required
              class="form-control"
              placeholder="••••••••"
              autocomplete="current-password"
            />
            <div *ngIf="passwordCtrl.invalid && (passwordCtrl.dirty || passwordCtrl.touched)" class="field-error">
              Password is required
            </div>
          </div>

          <button
            type="submit"
            class="btn btn-submit"
            [disabled]="loginForm.invalid || isLoading"
          >
            <span *ngIf="!isLoading">Log In</span>
            <span *ngIf="isLoading">Authenticating...</span>
          </button>

          <button
            type="button"
            class="btn btn-demo"
            (click)="fillDemoCredentials()"
          >
            Fill Demo Credentials (demo / demo123)
          </button>
        </form>

        <div class="auth-footer">
          <p>Don't have an account? <a routerLink="/register">Register here</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(80vh - 4rem);
      padding: 1rem;
    }
    .auth-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 2.5rem;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .auth-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .auth-logo {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    .auth-header h2 {
      font-size: 1.6rem;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 0.5rem;
    }
    .auth-header p {
      color: #94a3b8;
      font-size: 0.9rem;
    }
    .alert {
      padding: 0.75rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      margin-bottom: 1.25rem;
    }
    .alert-success {
      background-color: rgba(16, 185, 129, 0.15);
      border: 1px solid #10b981;
      color: #34d399;
    }
    .alert-error {
      background-color: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #f87171;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .form-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #cbd5e1;
    }
    .form-control {
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 0.65rem 0.875rem;
      font-size: 0.95rem;
      color: #f8fafc;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .form-control:focus {
      border-color: #3b82f6;
    }
    .field-error {
      font-size: 0.75rem;
      color: #f87171;
    }
    .btn {
      padding: 0.75rem 1rem;
      border-radius: 6px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }
    .btn-submit {
      background-color: #2563eb;
      color: #ffffff;
      margin-top: 0.5rem;
    }
    .btn-submit:hover:not(:disabled) {
      background-color: #1d4ed8;
    }
    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-demo {
      background-color: transparent;
      border: 1px dashed #475569;
      color: #94a3b8;
      font-size: 0.85rem;
    }
    .btn-demo:hover {
      background-color: #1e293b;
      color: #e2e8f0;
      border-color: #64748b;
    }
    .auth-footer {
      margin-top: 1.5rem;
      text-align: center;
      font-size: 0.875rem;
      color: #94a3b8;
    }
    .auth-footer a {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 600;
    }
    .auth-footer a:hover {
      text-decoration: underline;
    }
  `]
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.route.queryParams.subscribe(params => {
      if (params['registered'] === 'true') {
        this.successMessage = 'Registration successful! You can now log in.';
      }
    });
  }

  fillDemoCredentials(): void {
    this.username = 'demo';
    this.password = 'demo123';
  }

  onSubmit(): void {
    if (!this.username || !this.password) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.isLoading = false;
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Login failed. Please check your credentials.';
      }
    });
  }
}
