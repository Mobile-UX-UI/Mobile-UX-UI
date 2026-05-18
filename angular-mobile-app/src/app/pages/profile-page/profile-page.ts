import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser, CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../services/auth/auth.service';
import { BottomNavbar } from '../../components/bottom-navbar/bottom-navbar';
import { UserProfile } from '../../models/profile/user-profile';

@Component({
  selector: 'app-profile-page',
  imports: [CommonModule, MatButtonModule, MatSnackBarModule, MatIconModule, BottomNavbar],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  profile: UserProfile | null = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = this.authService.getToken();

    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.profile = this.authService.getUserProfile();
  }

  onLogout(): void {
    const result = this.authService.logout();

    const finishLogout = () => {
      this.authService.clearAll();
      this.router.navigate(['/login']);
    };

    if (!result) {
      finishLogout();
      return;
    }

    result.subscribe({
      next: finishLogout,
      error: finishLogout,
    });
  }

  onDeregister(): void {
    const result = this.authService.deregister();

    if (!result) {
      this.snackBar.open('Account could not be deleted.', 'OK', {
        duration: 3000,
        verticalPosition: 'bottom',
        horizontalPosition: 'center',
        panelClass: ['error-snackbar'],
      });
      return;
    }

    result.subscribe({
      next: () => {
        this.authService.clearAll();

        this.snackBar.open('Account deleted', 'OK', {
          duration: 3000,
          verticalPosition: 'bottom',
          horizontalPosition: 'center',
          panelClass: ['success-snackbar'],
        });

        this.router.navigate(['/login']);
      },

      error: (error: HttpErrorResponse) => {
        const message =
          typeof error.error === 'string'
            ? error.error
            : (error?.error?.message ?? 'Invalid token');

        this.snackBar.open(message, 'OK', {
          duration: 3000,
          verticalPosition: 'bottom',
          horizontalPosition: 'center',
          panelClass: ['error-snackbar'],
        });
      },
    });
  }
}
