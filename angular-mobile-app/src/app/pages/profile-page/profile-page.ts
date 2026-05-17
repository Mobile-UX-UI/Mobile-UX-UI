import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../services/auth/auth.service';
import { BottomNavbar } from '../../components/bottom-navbar/bottom-navbar';

@Component({
  selector: 'app-profile-page',
  imports: [MatButtonModule, MatSnackBarModule, BottomNavbar],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = this.authService.getToken();

    if (!token) {
      this.router.navigate(['/login']);
      return;
    }
  }

  onLogout(): void {
    const result = this.authService.logout();

    if (!result) {
      this.authService.clearToken();
      this.router.navigate(['/login']);
      return;
    }

    result.subscribe({
      next: () => {
        this.authService.clearToken();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.authService.clearToken();
        this.router.navigate(['/login']);
      },
    });
  }

  onDeregister(): void {
    const result = this.authService.deregister();

    if (!result) {
      this.authService.clearToken();
      this.router.navigate(['/login']);
      return;
    }

    result.subscribe({
      next: () => {
        this.authService.clearToken();

        this.snackBar.open('Account deleted', 'OK', {
          duration: 3000,
          verticalPosition: 'bottom',
          horizontalPosition: 'center',
        });

        this.router.navigate(['/login']);
      },
      error: (error: HttpErrorResponse) => {
        const message =
          typeof error.error === 'string'
            ? error.error
            : (error?.error?.message ?? 'Invalid token');

        this.authService.clearToken();

        this.snackBar.open(message, 'OK', {
          duration: 3000,
          verticalPosition: 'bottom',
          horizontalPosition: 'center',
          panelClass: ['error-snackbar'],
        });

        this.router.navigate(['/login']);
      },
    });
  }
}
