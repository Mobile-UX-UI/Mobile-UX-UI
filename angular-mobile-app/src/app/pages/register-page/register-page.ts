import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';

import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-register-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
  ],
  templateUrl: './register-page.html',
  styleUrl: './register-page.css',
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  errorMessage = '';
  successMessage = '';

  registerForm = this.fb.group(
    {
      userid: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(8)]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      nickname: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(5)]],
      repeatPassword: ['', Validators.required],
    },
    { validators: this.passwordMatchValidator },
  );

  public passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const repeatPassword = control.get('repeatPassword')?.value;

    return password === repeatPassword ? null : { mismatch: true };
  }

  public onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();

      if (this.registerForm.hasError('mismatch')) {
        this.showError('Passwords do not match');
      } else {
        this.showError('Please fill in all required fields correctly');
      }

      return;
    }

    const { userid, firstName, lastName, nickname, password } = this.registerForm.getRawValue();

    if (!userid || !firstName || !lastName || !nickname || !password) {
      this.showError('Missing required data');
      return;
    }

    const fullname = `${firstName} ${lastName}`;

    this.authService
      .register(userid, password, nickname, fullname)

      .subscribe({
        next: (response) => {
          if (response?.token) {
            this.authService.saveToken(response.token);
          }

          this.snackBar.open('Registration successful.', 'OK', {
            duration: 3000,
            verticalPosition: 'bottom',
            horizontalPosition: 'center',
            panelClass: ['success-snackbar'],
          });

          this.router.navigate(['/chat']);
        },
        error: (error: HttpErrorResponse) => {
          const message =
            typeof error.error === 'string'
              ? error.error
              : (error?.error?.message ?? 'Registration failed');

          this.showError(message);
        },
      });
  }

  public goBack(): void {
    this.router.navigate(['/login']);
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'OK', {
      duration: 4000,
      verticalPosition: 'bottom',
      horizontalPosition: 'center',
      panelClass: ['error-snackbar'],
    });
  }
}
