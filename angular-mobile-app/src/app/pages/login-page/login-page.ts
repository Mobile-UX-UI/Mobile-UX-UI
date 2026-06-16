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

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
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
        if (response?.status !== 'ok' || !response?.token) {
          this.authService.clearSession();
          this.showError(response?.message ?? 'Login failed');
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
