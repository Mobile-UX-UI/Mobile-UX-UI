import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { LoadingSpinner } from './components/loading-spinner/loading-spinner';
import { ThemeService } from './services/system/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingSpinner],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private themeService = inject(ThemeService);

  constructor() {
    this.themeService.initTheme();
  }
}