import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-container">
      <div class="profile-card">
        <div class="profile-header">
          <div class="avatar-circle">
            {{ user?.username ? user!.username.charAt(0).toUpperCase() : 'U' }}
          </div>
          <div class="profile-title">
            <h2>User Profile</h2>
            <p>Your simulated trading account details</p>
          </div>
        </div>

        <div *ngIf="isLoading" class="loading-state">
          <p>Loading profile information...</p>
        </div>

        <div *ngIf="errorMessage" class="alert alert-error">
          {{ errorMessage }}
        </div>

        <div *ngIf="!isLoading && user" class="profile-details">
          <div class="detail-row">
            <span class="detail-label">Username</span>
            <span class="detail-value highlight">{{ user.username }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Email Address</span>
            <span class="detail-value">{{ user.email }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Account Type</span>
            <span class="detail-badge">Simulated Demo Account</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Member Since</span>
            <span class="detail-value">{{ user.createdAt | date:'mediumDate' }}</span>
          </div>

          <div class="profile-actions">
            <button class="btn btn-logout" (click)="onLogout()">
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      display: flex;
      justify-content: center;
      padding: 2rem 1rem;
    }
    .profile-card {
      background-color: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 2.5rem;
      width: 100%;
      max-width: 560px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .profile-header {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #1e293b;
    }
    .avatar-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      color: #ffffff;
      font-size: 1.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .profile-title h2 {
      margin: 0;
      font-size: 1.5rem;
      color: #f8fafc;
    }
    .profile-title p {
      margin: 0.25rem 0 0;
      color: #94a3b8;
      font-size: 0.875rem;
    }
    .loading-state {
      padding: 2rem;
      text-align: center;
      color: #94a3b8;
    }
    .alert-error {
      background-color: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #f87171;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
    }
    .profile-details {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #1e293b;
    }
    .detail-label {
      color: #94a3b8;
      font-size: 0.9rem;
      font-weight: 500;
    }
    .detail-value {
      color: #f1f5f9;
      font-weight: 600;
      font-size: 0.95rem;
    }
    .detail-value.highlight {
      color: #38bdf8;
    }
    .detail-badge {
      background-color: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .profile-actions {
      margin-top: 1.5rem;
      display: flex;
      justify-content: flex-end;
    }
    .btn-logout {
      background-color: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid #ef4444;
      padding: 0.6rem 1.25rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-logout:hover {
      background-color: #ef4444;
      color: #ffffff;
    }
  `]
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  isLoading = true;
  errorMessage = '';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.user = profile;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to load user profile';
      }
    });
  }

  onLogout(): void {
    this.authService.logout();
  }
}
