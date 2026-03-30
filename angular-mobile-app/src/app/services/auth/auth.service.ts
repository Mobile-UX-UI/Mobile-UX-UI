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
          const token = response.token.trim();
          localStorage.setItem(this.tokenKey, token);
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
    });
  }

  public getToken(): string | null {
    const token = localStorage.getItem(this.tokenKey);
    return token ? token.trim() : null;
  }

  public isLoggedIn(): boolean {
    return !!this.getToken();
  }

  public validateToken(): Observable<unknown> | void {
    const token = this.getToken();

    if (!token) return;

    return this.api.get('validatetoken', { token });
  }

  public logout(): Observable<unknown> | void {
    const token = this.getToken();

    if (!token) {
      this.clearToken();
      return;
    }

    return this.api.get('logout', { token }).pipe(
      tap(() => this.clearToken())
    );
  }

  public deregister(): Observable<unknown> | void {
    const token = this.getToken();

    if (!token) {
      this.clearToken();
      return;
    }

    return this.api.get('deregister', { token }).pipe(
      tap(() => this.clearToken())
    );
  }

  public clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }
}