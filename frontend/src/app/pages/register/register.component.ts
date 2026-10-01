import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">📈</div>
          <h2>Create Account</h2>
          <p>Start your simulated stock portfolio with demo capital</p>
        </div>

        <div *ngIf="errorMessage" class="alert alert-error">
          {{ errorMessage }}
        </div>

        <form (ngSubmit)="onSubmit()" #regForm="ngForm" class="auth-form">
          <div class="form-group">
            <label for="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              [(ngModel)]="username"
              #usernameCtrl="ngModel"
              required
              minlength="3"
              class="form-control"
              placeholder="Minimum 3 characters"
              autocomplete="username"
            />
            <div *ngIf="usernameCtrl.invalid && (usernameCtrl.dirty || usernameCtrl.touched)" class="field-error">
              <span *ngIf="usernameCtrl.errors?.['required']">Username is required</span>
              <span *ngIf="usernameCtrl.errors?.['minlength']">Username must be at least 3 characters</span>
            </div>
          </div>

          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="email"
              #emailCtrl="ngModel"
              required
              email
              class="form-control"
              placeholder="e.g. user@example.com"
              autocomplete="email"
            />
            <div *ngIf="emailCtrl.invalid && (emailCtrl.dirty || emailCtrl.touched)" class="field-error">
              <span *ngIf="emailCtrl.errors?.['required']">Email is required</span>
              <span *ngIf="emailCtrl.errors?.['email']">Please enter a valid email address</span>
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
              minlength="6"
              class="form-control"
              placeholder="Minimum 6 characters"
              autocomplete="new-password"
            />
            <div *ngIf="passwordCtrl.invalid && (passwordCtrl.dirty || passwordCtrl.touched)" class="field-error">
              <span *ngIf="passwordCtrl.errors?.['required']">Password is required</span>
              <span *ngIf="passwordCtrl.errors?.['minlength']">Password must be at least 6 characters</span>
            </div>
          </div>

          <button
            type="submit"
            class="btn btn-submit"
            [disabled]="regForm.invalid || isLoading"
          >
            <span *ngIf="!isLoading">Create Account</span>
            <span *ngIf="isLoading">Registering...</span>
          </button>
        </form>

        <div class="auth-footer">
          <p>Already have an account? <a routerLink="/login">Log in here</a></p>
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
export class RegisterComponent implements OnInit {
  username = '';
  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    if (!this.username || !this.email || !this.password) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.register({
      username: this.username,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/login'], { queryParams: { registered: 'true' } });
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Registration failed. Please check the provided information.';
      }
    });
  }
}
