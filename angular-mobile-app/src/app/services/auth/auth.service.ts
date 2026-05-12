import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';
import { AuthResponse } from '../../models/auth/auth-response.model';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);

  private readonly tokenKey = 'auth_token';

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  public login(userid: string, password: string): Observable<AuthResponse> {
    return this.api.get<AuthResponse>('login', { userid, password }, { noCache: true });
  }

  public register(
    userid: string,
    password: string,
    nickname: string,
    fullname: string,
  ): Observable<AuthResponse> {
    return this.api.get<AuthResponse>(
      'register',
      {
        userid,
        password,
        nickname,
        fullname,
      },
      { noCache: true },
    );
  }

  public validateToken(): Observable<unknown> | null {
    const token = this.getToken();

    if (!token) return null;

    return this.api.get('validatetoken', { token }, { noCache: true });
  }

  public logout(): Observable<unknown> | null {
    const token = this.getToken();

    if (!token) return null;

    return this.api.get('logout', { token }, { noCache: true });
  }

  public deregister(): Observable<unknown> | null {
    const token = this.getToken();

    if (!token) return null;

    return this.api.get('deregister', { token }, { noCache: true });
  }

  public getToken(): string | null {
    if (!this.isBrowser()) return null;

    const token = localStorage.getItem(this.tokenKey);

    return token ? token.trim() : null;
  }

  public saveToken(token: string): void {
    if (!this.isBrowser()) return;

    localStorage.setItem(this.tokenKey, token.trim());
  }

  public clearToken(): void {
    if (!this.isBrowser()) return;

    localStorage.removeItem(this.tokenKey);
  }

  public isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
