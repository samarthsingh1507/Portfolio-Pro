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
      <div class="auth-card" [class.blur-behind]="showSplash">
        <div class="auth-header">
          <div class="auth-logo-badge">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <h2>Welcome Back</h2>
          <p>Log in to access your institutional trading & portfolio desk</p>
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
            <span *ngIf="!isLoading">Log In & Launch Desk</span>
            <span *ngIf="isLoading" class="loading-inline">
              <span class="spinner-micro"></span> Authenticating...
            </span>
          </button>

          <div class="auth-secondary-actions">
            <button
              type="button"
              class="btn btn-demo"
              (click)="fillDemoCredentials()"
            >
              Fill Demo Credentials (demo / demo123)
            </button>

            <button
              type="button"
              class="btn btn-preview-intro"
              (click)="triggerSplashPreview()"
            >
              ✨ Preview Launch Animation
            </button>
          </div>
        </form>

        <div class="auth-footer">
          <p>Don't have an account? <a routerLink="/register">Register here</a></p>
        </div>
      </div>

      <!-- FULL-SCREEN LUXURY CINEMATIC SPLASH ANIMATION OVERLAY -->
      <div *ngIf="showSplash" class="luxury-splash-overlay" (click)="completeNavigation()">
        <!-- Ambient Glowing Nebulas & Particle Lighting -->
        <div class="splash-ambient-glow"></div>
        <div class="splash-laser-line"></div>

        <div class="splash-center-stage">
          <!-- 1. Luxury Hologram Prism Logo Reveal -->
          <div class="splash-logo-container">
            <div class="splash-logo-halo"></div>
            <div class="splash-logo-prism">
              <svg width="68" height="68" viewBox="0 0 100 100" fill="none">
                <defs>
                  <linearGradient id="prismGoldCyan" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#38bdf8"/>
                    <stop offset="50%" stop-color="#818cf8"/>
                    <stop offset="100%" stop-color="#fbbf24"/>
                  </linearGradient>
                  <filter id="prismGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="8" result="glow"/>
                    <feComposite in="SourceGraphic" in2="glow" operator="over"/>
                  </filter>
                </defs>
                <polygon points="50,10 90,32 90,78 50,98 10,78 10,32" stroke="url(#prismGoldCyan)" stroke-width="3.5" fill="rgba(15, 23, 42, 0.75)" filter="url(#prismGlow)"/>
                <polyline points="50,10 50,98" stroke="url(#prismGoldCyan)" stroke-width="2" stroke-dasharray="3,3"/>
                <polyline points="10,32 50,55 90,32" stroke="url(#prismGoldCyan)" stroke-width="2.5"/>
                <polyline points="10,78 50,55 90,78" stroke="url(#prismGoldCyan)" stroke-width="2.5"/>
                <circle cx="50" cy="55" r="7" fill="#38bdf8" filter="url(#prismGlow)"/>
              </svg>
            </div>
          </div>

          <!-- 2. "Portfolio Pro" Left-to-Right Slow Reveal Cursive Signature -->
          <div class="cursive-reveal-wrapper">
            <h1 class="cursive-brand-name">Portfolio Pro</h1>
            <div class="shimmer-light-sweep"></div>
          </div>

          <!-- 3. Catchy Tagline Pop-Up -->
          <div class="tagline-popup-container">
            <span class="tagline-accent-line"></span>
            <p class="tagline-catchy-phrase">
              Where Precision Intelligence Meets Autonomous Trading Excellence.
            </p>
            <span class="tagline-accent-line"></span>
          </div>

          <!-- 4. Bottom Signature in Small Bold Lettering -->
          <div class="creator-signature-badge">
            <span class="sparkle-icon">✦</span>
            <span class="signature-text">MADE BY <strong>SAMARTH SINGH</strong></span>
            <span class="sparkle-icon">✦</span>
          </div>
        </div>

        <!-- Skip Button -->
        <button class="skip-splash-btn" (click)="completeNavigation(); $event.stopPropagation()">
          <span>Entering Trading Desk</span>
          <span class="skip-arrow">→</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(85vh - 4rem);
      padding: 1.5rem;
    }
    .auth-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 2.75rem 2.5rem;
      width: 100%;
      max-width: 450px;
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 25px rgba(56, 189, 248, 0.08);
      transition: filter 0.3s ease, opacity 0.3s ease;
    }
    .auth-card.blur-behind {
      filter: blur(8px);
      opacity: 0.3;
    }
    .auth-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .auth-logo-badge {
      width: 54px;
      height: 54px;
      border-radius: 14px;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.2);
    }
    .auth-header h2 {
      font-size: 1.7rem;
      font-weight: 800;
      color: #f8fafc;
      margin-bottom: 0.4rem;
      letter-spacing: -0.5px;
    }
    .auth-header p {
      color: #94a3b8;
      font-size: 0.875rem;
      line-height: 1.45;
    }
    .alert {
      padding: 0.75rem 1rem;
      border-radius: 8px;
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
      gap: 0.4rem;
    }
    .form-group label {
      font-size: 0.825rem;
      font-weight: 700;
      color: #cbd5e1;
    }
    .form-control {
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      font-size: 0.95rem;
      color: #f8fafc;
      outline: none;
      transition: all 0.2s ease;
    }
    .form-control:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
    }
    .field-error {
      font-size: 0.75rem;
      color: #f87171;
    }
    .btn {
      padding: 0.8rem 1.25rem;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }
    .btn-submit {
      background: linear-gradient(135deg, #2563eb 0%, #38bdf8 100%);
      color: #ffffff;
      margin-top: 0.35rem;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
    }
    .btn-submit:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(56, 189, 248, 0.45);
    }
    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .loading-inline {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .spinner-micro {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .auth-secondary-actions {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      margin-top: 0.35rem;
    }
    .btn-demo {
      background-color: transparent;
      border: 1px dashed #475569;
      color: #94a3b8;
      font-size: 0.825rem;
      padding: 0.6rem 0.85rem;
    }
    .btn-demo:hover {
      background-color: #1e293b;
      color: #f1f5f9;
      border-color: #38bdf8;
    }
    .btn-preview-intro {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fbbf24;
      font-size: 0.825rem;
      padding: 0.6rem 0.85rem;
    }
    .btn-preview-intro:hover {
      background: rgba(245, 158, 11, 0.2);
    }
    .auth-footer {
      margin-top: 1.75rem;
      text-align: center;
      font-size: 0.875rem;
      color: #94a3b8;
    }
    .auth-footer a {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 700;
    }
    .auth-footer a:hover {
      text-decoration: underline;
    }

    /* ==========================================================================
       LUXURY CINEMATIC SPLASH ANIMATION OVERLAY & SLOW REVEAL
       ========================================================================== */
    .luxury-splash-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100vw;
      height: 100vh;
      background: radial-gradient(circle at center, #0a1128 0%, #030712 100%);
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      overflow: hidden;
      animation: overlayFadeIn 0.5s ease-out forwards;
    }
    @keyframes overlayFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Ambient Nebulas & Flare Beam */
    .splash-ambient-glow {
      position: absolute;
      width: 600px;
      height: 600px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, rgba(129, 140, 248, 0.08) 50%, transparent 70%);
      filter: blur(50px);
      pointer-events: none;
      animation: ambientPulse 4s ease-in-out infinite alternate;
    }
    @keyframes ambientPulse {
      0% { transform: scale(0.85); opacity: 0.5; }
      100% { transform: scale(1.15); opacity: 0.9; }
    }
    .splash-laser-line {
      position: absolute;
      top: 50%;
      left: 0;
      width: 100%;
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.6) 50%, transparent 100%);
      pointer-events: none;
      opacity: 0.4;
      transform: translateY(-50%);
    }

    /* Center Stage Container */
    .splash-center-stage {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      z-index: 10;
      padding: 2rem;
      max-width: 820px;
      width: 90%;
    }

    /* Stage 1: Logo Prism Reveal */
    .splash-logo-container {
      position: relative;
      margin-bottom: 1.25rem;
      animation: logoReveal 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes logoReveal {
      0% { opacity: 0; transform: scale(0.4) rotate(-15deg); filter: blur(10px); }
      70% { transform: scale(1.08) rotate(3deg); filter: blur(0px); }
      100% { opacity: 1; transform: scale(1) rotate(0deg); }
    }
    .splash-logo-halo {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 110px;
      height: 110px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, transparent 70%);
      filter: blur(12px);
      pointer-events: none;
    }

    /* Stage 2: Cursive Left-to-Right Handwriting Slow Reveal ("Portfolio Pro") */
    .cursive-reveal-wrapper {
      position: relative;
      display: inline-block;
      overflow: hidden;
      margin-bottom: 1rem;
      padding: 0.5rem 1.5rem;
    }
    .cursive-brand-name {
      font-family: 'Great Vibes', 'Alex Brush', cursive, serif;
      font-size: clamp(3.8rem, 8vw, 6.2rem);
      font-weight: 400;
      line-height: 1.15;
      margin: 0;
      background: linear-gradient(135deg, #ffffff 0%, #e0f2fe 35%, #38bdf8 65%, #fbbf24 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 0 25px rgba(56, 189, 248, 0.55)) drop-shadow(0 4px 15px rgba(0, 0, 0, 0.8));
      white-space: nowrap;
      display: inline-block;
      
      /* Smooth left-to-right slow reveal */
      clip-path: inset(0 100% 0 0);
      animation: cursiveHandwritingDraw 1.8s cubic-bezier(0.25, 1, 0.35, 1) 0.35s forwards;
    }
    @keyframes cursiveHandwritingDraw {
      0% {
        clip-path: inset(0 100% 0 0);
        opacity: 0.2;
        transform: translateX(-15px);
      }
      30% {
        opacity: 1;
      }
      100% {
        clip-path: inset(0 0 0 0);
        opacity: 1;
        transform: translateX(0px);
      }
    }

    .shimmer-light-sweep {
      position: absolute;
      top: 0;
      left: -100%;
      width: 60%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
      transform: skewX(-25deg);
      pointer-events: none;
      animation: shimmerSweep 2.2s ease-in-out 1.2s infinite;
    }
    @keyframes shimmerSweep {
      0% { left: -100%; }
      100% { left: 200%; }
    }

    /* Stage 3: Catchy Tagline Pop-Up */
    .tagline-popup-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 2.25rem;
      opacity: 0;
      transform: translateY(18px) scale(0.95);
      animation: taglinePopup 0.9s cubic-bezier(0.16, 1, 0.3, 1) 1.2s forwards;
    }
    @keyframes taglinePopup {
      0% { opacity: 0; transform: translateY(18px) scale(0.95); filter: blur(6px); }
      100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); }
    }
    .tagline-accent-line {
      width: 38px;
      height: 1px;
      background: linear-gradient(90deg, transparent, #38bdf8, transparent);
    }
    .tagline-catchy-phrase {
      margin: 0;
      font-family: 'Cinzel', 'Plus Jakarta Sans', serif;
      font-size: clamp(0.85rem, 2vw, 1.15rem);
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #cbd5e1;
      text-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
    }

    /* Stage 4: Creator Signature Badge ("MADE BY SAMARTH SINGH") */
    .creator-signature-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.65rem;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(251, 191, 36, 0.4);
      padding: 0.45rem 1.2rem;
      border-radius: 9999px;
      box-shadow: 0 0 20px rgba(251, 191, 36, 0.2);
      opacity: 0;
      transform: translateY(12px);
      animation: signatureReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.7s forwards;
    }
    @keyframes signatureReveal {
      0% { opacity: 0; transform: translateY(12px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .sparkle-icon {
      color: #fbbf24;
      font-size: 0.85rem;
      animation: sparkleGlow 1.5s infinite alternate;
    }
    @keyframes sparkleGlow {
      from { opacity: 0.6; transform: scale(0.85); }
      to { opacity: 1; transform: scale(1.2); }
    }
    .signature-text {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.2em;
      color: #e2e8f0;
      text-transform: uppercase;
    }
    .signature-text strong {
      color: #fbbf24;
      font-weight: 900;
      text-shadow: 0 0 10px rgba(251, 191, 36, 0.6);
    }

    /* Skip / Next Desk Button */
    .skip-splash-btn {
      position: absolute;
      bottom: 2rem;
      right: 2.5rem;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #94a3b8;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s ease;
      opacity: 0;
      animation: skipBtnFade 0.6s ease 2.0s forwards;
    }
    @keyframes skipBtnFade {
      to { opacity: 1; }
    }
    .skip-splash-btn:hover {
      background: #1e293b;
      color: #38bdf8;
      border-color: #38bdf8;
    }
  `]
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showSplash = false;

  private splashTimeout: any = null;

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

  triggerSplashPreview(): void {
    this.showSplash = true;
    if (this.splashTimeout) clearTimeout(this.splashTimeout);
    this.splashTimeout = setTimeout(() => {
      this.showSplash = false;
    }, 4500);
  }

  completeNavigation(): void {
    if (this.splashTimeout) clearTimeout(this.splashTimeout);
    this.showSplash = false;
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    this.router.navigateByUrl(returnUrl);
  }

  onSubmit(): void {
    if (!this.username || !this.password) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.isLoading = false;
        // Trigger the cinematic slow reveal splash animation!
        this.showSplash = true;
        this.splashTimeout = setTimeout(() => {
          this.completeNavigation();
        }, 3400);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Login failed. Please check your credentials.';
      }
    });
  }
}
