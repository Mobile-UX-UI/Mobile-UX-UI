import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage {
  hidePassword = true;

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  loginForm = this.fb.group({
    userid: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(8)]],
    password: ['', [Validators.required, Validators.minLength(5)]],
  });

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.showError('Please enter your userid and password correctly');
      return;
    }

    const { userid, password } = this.loginForm.getRawValue();

    if (!userid || !password) {
      this.showError('Missing login data');
      return;
    }

    this.authService.clearToken();

    this.authService.login(userid, password).subscribe({
      next: (response) => {
        if (response?.status === 'ok' && response?.token) {
          this.authService.saveToken(response.token);
          this.router.navigate(['/groups']);
        } else {
          this.authService.clearToken();
          this.showError(response?.message ?? 'Login failed');
        }
      },
      error: (error: HttpErrorResponse) => {
        this.authService.clearToken();

        const message =
          typeof error.error === 'string' ? error.error : (error?.error?.message ?? 'Login failed');

        this.showError(message);
      },
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  private showError(message: string): void {
    setTimeout(() => {
      this.snackBar.open(message, 'OK', {
        duration: 4000,
        verticalPosition: 'bottom',
        horizontalPosition: 'center',
        panelClass: ['error-snackbar'],
      });
    });
  }
}
