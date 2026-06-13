import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  private readonly themeKey = 'dark_mode_enabled';

  public initTheme(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const isDarkMode = localStorage.getItem(this.themeKey) === 'true';
    this.applyTheme(isDarkMode);
  }

  public isDarkMode(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;

    return localStorage.getItem(this.themeKey) === 'true';
  }

  public setDarkMode(enabled: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;

    localStorage.setItem(this.themeKey, String(enabled));
    this.applyTheme(enabled);
  }

  private applyTheme(enabled: boolean): void {
    if (enabled) {
      this.document.body.classList.add('dark-mode');
    } else {
      this.document.body.classList.remove('dark-mode');
    }
  }
}