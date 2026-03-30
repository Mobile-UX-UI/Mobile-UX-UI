import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-chat-page',
  imports: [MatButtonModule, MatSnackBarModule],
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.css',
})
export class ChatPage{
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isProcessing = false;

  onLogout(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    const result = this.authService.logout();

    if (!result) {
      this.isProcessing = false;
      this.authService.clearToken();
      this.router.navigate(['/login']);
      return;
    }

    result.subscribe({
      next: () => {
        this.isProcessing = false;
        this.authService.clearToken();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.isProcessing = false;
        this.authService.clearToken();
        this.router.navigate(['/login']);
      }
    });
  }

  onDeregister(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    const result = this.authService.deregister();

    if (!result) {
      this.isProcessing = false;
      this.authService.clearToken();
      this.router.navigate(['/login']);
      return;
    }

    result.subscribe({
      next: () => {
        this.isProcessing = false;
        this.authService.clearToken();

        this.snackBar.open('Account deleted', 'OK', {
          duration: 3000,
          verticalPosition: 'bottom',
          horizontalPosition: 'center'
        });

        this.router.navigate(['/login']);
      },
      error: (error: HttpErrorResponse) => {
        this.isProcessing = false;

        const message =
          typeof error.error === 'string'
            ? error.error
            : error?.error?.message ?? 'Invalid token';

        this.authService.clearToken();

        this.snackBar.open(message, 'OK', {
          duration: 3000,
          verticalPosition: 'bottom',
          horizontalPosition: 'center',
          panelClass: ['error-snackbar']
        });

        this.router.navigate(['/login']);
      }
    });
  }
}