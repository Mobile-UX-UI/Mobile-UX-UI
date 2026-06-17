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
  fieldErrors: Record<string, string> = {};

  registerForm = this.fb.group(
    {
      userid: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(8),
          Validators.pattern(/^[a-zA-Z]{4}it\d{2}$/),
        ],
      ],
      firstName: ['', [Validators.required, Validators.maxLength(15)]],
      lastName: ['', [Validators.required, Validators.maxLength(15)]],
      nickname: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      repeatPassword: ['', Validators.required],
    },
    { validators: this.passwordMatchValidator },
  );

  constructor() {
    for (const fieldName of Object.keys(this.registerForm.controls)) {
      this.registerForm.get(fieldName)?.valueChanges.subscribe(() => {
        this.clearFieldError(fieldName);
      });
    }
  }

  public passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const repeatPassword = control.get('repeatPassword')?.value;

    return password === repeatPassword ? null : { mismatch: true };
  }

  public onSubmit(): void {
    this.clearFieldErrors();

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();

      this.showError(
        this.registerForm.hasError('mismatch')
          ? 'Passwords do not match'
          : 'Please fill in all required fields correctly',
      );

      if (this.registerForm.hasError('mismatch')) {
        this.setFieldError('repeatPassword', 'Passwords do not match');
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
          if (response?.status && response.status !== 'ok') {
            this.handleRegistrationError(response.message ?? 'Registration failed');
            return;
          }

          if (response?.token) {
            this.authService.saveToken(response.token);
          }

          this.authService.saveUserProfile({
            userid,
            firstName,
            lastName,
            nickname,
            fullname,
            hash: response?.hash,
          });

          this.snackBar.open('Registration successful.', 'OK', {
            duration: 3000,
            verticalPosition: 'bottom',
            horizontalPosition: 'center',
            panelClass: ['success-snackbar'],
          });

          this.router.navigate(['/chats']);
        },
        error: (error: HttpErrorResponse) => {
          const message =
            typeof error.error === 'string'
              ? error.error
              : (error?.error?.message ?? 'Registration failed');

          this.handleRegistrationError(message);
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

  getFieldError(
    fieldName: 'userid' | 'firstName' | 'lastName' | 'nickname' | 'password' | 'repeatPassword',
  ): string {
    const control = this.registerForm.get(fieldName);

    if (!control || (!control.touched && !control.dirty)) return '';

    if (this.fieldErrors[fieldName]) return this.fieldErrors[fieldName];

    if (control.hasError('required')) {
      return this.getRequiredMessage(fieldName);
    }

    if (fieldName === 'userid') {
      if (control.hasError('minlength') || control.hasError('maxlength')) {
        return 'User ID must be 8 characters';
      }

      if (control.hasError('pattern')) {
        return 'Invalid User ID format';
      }
    }

    if (fieldName === 'nickname') {
      if (control.hasError('minlength')) return 'Nickname must be at least 2 characters';
      if (control.hasError('maxlength')) return 'Nickname can be max. 30 characters';
    }

    if ((fieldName === 'firstName' || fieldName === 'lastName') && control.hasError('maxlength')) {
      return 'Full name can be max. 30 characters';
    }

    if (fieldName === 'password' && control.hasError('minlength')) {
      return 'Password must be at least 6 characters';
    }

    if (
      fieldName === 'repeatPassword' &&
      this.registerForm.hasError('mismatch') &&
      control.touched
    ) {
      return 'Passwords do not match';
    }

    return '';
  }

  private handleRegistrationError(message: string): void {
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes('userid') || normalizedMessage.includes('user id')) {
      this.setFieldError('userid', 'Invalid or already used User ID');
    } else if (normalizedMessage.includes('nickname') || normalizedMessage.includes('nick')) {
      this.setFieldError('nickname', 'Invalid or already used nickname');
    } else if (normalizedMessage.includes('fullname') || normalizedMessage.includes('full name')) {
      this.setFieldError('firstName', 'Invalid name');
      this.setFieldError('lastName', 'Invalid name');
    } else if (normalizedMessage.includes('password')) {
      this.setFieldError('password', 'Invalid password');
    } else {
      this.errorMessage = message;
    }

    this.showError(message);
  }

  private setFieldError(fieldName: string, message: string): void {
    const control = this.registerForm.get(fieldName);

    this.fieldErrors[fieldName] = message;
    control?.setErrors({ ...(control.errors ?? {}), server: true });
    control?.markAsTouched();
  }

  private clearFieldError(fieldName: string): void {
    const control = this.registerForm.get(fieldName);

    delete this.fieldErrors[fieldName];

    if (control?.hasError('server')) {
      const errors = { ...(control.errors ?? {}) };
      delete errors['server'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  private clearFieldErrors(): void {
    this.errorMessage = '';

    for (const fieldName of Object.keys(this.registerForm.controls)) {
      this.clearFieldError(fieldName);
    }
  }

  private getRequiredMessage(fieldName: string): string {
    const labels: Record<string, string> = {
      userid: 'User ID',
      firstName: 'First name',
      lastName: 'Last name',
      nickname: 'Nickname',
      password: 'Password',
      repeatPassword: 'Repeated password',
    };

    return `${labels[fieldName] ?? 'Field'} is required`;
  }
}
