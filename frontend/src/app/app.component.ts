import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { SoundFxService } from './core/services/sound-fx.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'PortfolioPro';
  isMobileMenuOpen = false;

  @ViewChild('routeStage') routeStageRef?: ElementRef<HTMLDivElement>;
  private isFirstNavigation = true;

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    public soundFxService: SoundFxService,
    private router: Router
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.triggerRouteTransition();
    });
  }

  triggerRouteTransition(): void {
    if (this.isFirstNavigation) {
      this.isFirstNavigation = false;
      return;
    }

    // Play synthesized velvety wind swoosh
    this.soundFxService.playSwoosh();

    // Trigger smooth blur slide animation
    if (this.routeStageRef?.nativeElement) {
      const el = this.routeStageRef.nativeElement;
      el.classList.remove('route-swoosh-active');
      void el.offsetWidth; // Force DOM reflow to re-trigger CSS keyframes
      el.classList.add('route-swoosh-active');
    }
  }

  onRouteActivate(): void {
    if (!this.isFirstNavigation) {
      this.triggerRouteTransition();
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  onLogout(): void {
    this.closeMobileMenu();
    this.authService.logout();
  }
}
