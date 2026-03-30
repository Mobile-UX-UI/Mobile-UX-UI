import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../api/api.service';
import { AuthResponse } from '../../models/auth/auth-response.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = inject(ApiService);
  private readonly tokenKey = 'auth_token';

  public login(userid: string, password: string): Observable<AuthResponse> {
    return this.api.get<AuthResponse>('login', { userid, password }).pipe(
      tap((response) => {
        if (response.token) {
          localStorage.setItem(this.tokenKey, response.token);
        }
      })
    );
  }

  public register(
    userid: string,
    password: string,
    nickname: string,
    fullname: string
  ): Observable<AuthResponse> {
    return this.api.get<AuthResponse>('register', {
      userid,
      password,
      nickname,
      fullname,
    }).pipe(
      tap((response) => {
        if (response.token) {
          localStorage.setItem(this.tokenKey, response.token);
        }
      })
    );
  }

  public getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  public isLoggedIn(): boolean {
    return !!this.getToken();
  }

  public logout(): Observable<unknown> | void {
    const token = this.getToken();

    if (!token) {
      localStorage.removeItem(this.tokenKey);
      return;
    }

    return this.api.get('logout', { token }).pipe(
      tap(() => {
        localStorage.removeItem(this.tokenKey);
      })
    );
  }
}