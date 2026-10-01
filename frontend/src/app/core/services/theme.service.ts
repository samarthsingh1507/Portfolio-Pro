import { Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'portfoliopro_theme';
  readonly isDarkMode = signal<boolean>(true);

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme | null;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        this.setTheme(savedTheme, false);
        return;
      }
    } catch {
      // Ignore localStorage access issues
    }

    // Default to dark mode for fintech aesthetic
    this.setTheme('dark', false);
  }

  toggleTheme(): void {
    const nextTheme: Theme = this.isDarkMode() ? 'light' : 'dark';
    this.setTheme(nextTheme, true);
  }

  setTheme(theme: Theme, animate: boolean = true): void {
    this.isDarkMode.set(theme === 'dark');

    try {
      localStorage.setItem(this.THEME_KEY, theme);
    } catch {
      // Ignore localStorage access issues
    }

    if (typeof document === 'undefined') return;

    const html = document.documentElement;
    const body = document.body;

    if (animate) {
      html.classList.add('theme-transition');
    }

    if (theme === 'light') {
      html.setAttribute('data-theme', 'light');
      body.classList.remove('dark-mode');
      body.classList.add('light-mode');
    } else {
      html.setAttribute('data-theme', 'dark');
      body.classList.remove('light-mode');
      body.classList.add('dark-mode');
    }

    if (animate) {
      window.setTimeout(() => {
        html.classList.remove('theme-transition');
      }, 450);
    }
  }
}
