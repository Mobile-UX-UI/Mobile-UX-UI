import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../services/auth/auth.service';
import { ProfileService } from '../../services/profile/profile.service';
import { AuthResponse } from '../../models/auth/auth-response.model';
import { UserProfile } from '../../models/profile/user-profile';

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
  fieldErrors: Record<string, string> = {};

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private snackBar = inject(MatSnackBar);

  loginForm = this.fb.group({
    userid: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(8),
        Validators.pattern(/^[a-zA-Z]{4}it\d{2}$/),
      ],
    ],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    for (const fieldName of Object.keys(this.loginForm.controls)) {
      this.loginForm.get(fieldName)?.valueChanges.subscribe(() => {
        this.clearFieldError(fieldName);
      });
    }
  }

  onSubmit(): void {
    this.clearFieldErrors();

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
        if (response?.status !== 'ok' || !response?.token) {
          this.authService.clearSession();
          this.handleAuthError(response?.message ?? 'Login failed');
          return;
        }

        this.authService.saveToken(response.token);

        const profilesRequest = this.profileService.getProfiles();

        if (!profilesRequest) {
          const profile = {
            userid,
            firstName: '',
            lastName: '',
            nickname: userid,
            fullname: userid,
            hash: response.hash,
          };

          void this.finishLogin(userid, password, response, profile);
          return;
        }

        profilesRequest.subscribe({
          next: (profilesResponse) => {
            const currentProfile = profilesResponse.profiles?.find(
              (profile) => profile.hash === response.hash,
            );

            const profile = {
              userid: currentProfile?.userid ?? userid,
              firstName: '',
              lastName: '',
              nickname: currentProfile?.nickname ?? userid,
              fullname: currentProfile?.fullname ?? userid,
              hash: response.hash,
            };

            void this.finishLogin(userid, password, response, profile);
          },

          error: () => {
            const profile = {
              userid,
              firstName: '',
              lastName: '',
              nickname: userid,
              fullname: userid,
              hash: response.hash,
            };

            void this.finishLogin(userid, password, response, profile);
          },
        });
      },

      error: async (error: HttpErrorResponse) => {
        if (error.status === 0 && (await this.authService.loginOffline(userid, password))) {
          this.showSuccess('Offline login');
          this.router.navigate(['/chats']);
          return;
        }

        const message =
          typeof error.error === 'string' ? error.error : (error?.error?.message ?? 'Login failed');

        this.authService.clearSession();
        this.handleAuthError(message);
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

  private showSuccess(message: string): void {
    setTimeout(() => {
      this.snackBar.open(message, 'OK', {
        duration: 3000,
        verticalPosition: 'bottom',
        horizontalPosition: 'center',
        panelClass: ['success-snackbar'],
      });
    });
  }

  getFieldError(fieldName: 'userid' | 'password'): string {
    const control = this.loginForm.get(fieldName);

    if (!control || (!control.touched && !control.dirty)) return '';

    if (this.fieldErrors[fieldName]) return this.fieldErrors[fieldName];

    if (control.hasError('required')) {
      return fieldName === 'userid' ? 'User ID is required' : 'Password is required';
    }

    if (fieldName === 'userid') {
      if (control.hasError('minlength') || control.hasError('maxlength')) {
        return 'User ID must be 8 characters';
      }

      if (control.hasError('pattern')) {
        return 'Invalid User ID format';
      }
    }

    if (fieldName === 'password' && control.hasError('minlength')) {
      return 'Password must be at least 6 characters';
    }

    return '';
  }

  private handleAuthError(message: string): void {
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes('user') || normalizedMessage.includes('userid')) {
      this.setFieldError('userid', 'Invalid User ID');
    } else if (
      normalizedMessage.includes('password') ||
      normalizedMessage.includes('credential') ||
      normalizedMessage.includes('login')
    ) {
      this.setFieldError('password', 'Invalid password');
    } else {
      this.setFieldError('userid', 'Login data is invalid');
      this.setFieldError('password', 'Login data is invalid');
    }

    this.showError(message);
  }

  private setFieldError(fieldName: 'userid' | 'password', message: string): void {
    const control = this.loginForm.get(fieldName);

    this.fieldErrors[fieldName] = message;
    control?.setErrors({ ...(control.errors ?? {}), server: true });
    control?.markAsTouched();
  }

  private clearFieldError(fieldName: string): void {
    const control = this.loginForm.get(fieldName);

    delete this.fieldErrors[fieldName];

    if (control?.hasError('server')) {
      const errors = { ...(control.errors ?? {}) };
      delete errors['server'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  private clearFieldErrors(): void {
    for (const fieldName of Object.keys(this.loginForm.controls)) {
      this.clearFieldError(fieldName);
    }
  }

  private async finishLogin(
    userid: string,
    password: string,
    response: AuthResponse,
    profile: UserProfile,
  ): Promise<void> {
    if (!response.token) return;

    this.authService.saveUserProfile(profile);
    await this.authService.saveOfflineLogin(userid, password, response.token, response.hash, profile);
    this.router.navigate(['/chats']);
  }
}
