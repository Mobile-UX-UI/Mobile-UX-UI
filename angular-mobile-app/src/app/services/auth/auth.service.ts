import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../api/api.service';
import { AuthResponse } from '../../models/auth/auth-response.model';
import { StatusResponse } from '../../models/common/status-response';
import { UserProfile } from '../../models/profile/user-profile';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);

  private readonly tokenKey = 'auth_token';
  private readonly profileKey = 'user_profile';
  private readonly offlineLoginKey = 'offline_login';

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
      { userid, password, nickname, fullname },
      { noCache: true },
    );
  }

  public validateToken(): Observable<StatusResponse> | null {
    const token = this.getToken();

    if (!token) return null;

    return this.api.get<StatusResponse>('validatetoken', { token }, { noCache: true });
  }

  public logout(): Observable<StatusResponse> | null {
    const token = this.getToken();

    if (!token) return null;

    return this.api.get<StatusResponse>('logout', { token }, { noCache: true });
  }

  public deregister(): Observable<StatusResponse> | null {
    const token = this.getToken();

    if (!token) return null;

    return this.api.get<StatusResponse>('deregister', { token }, { noCache: true });
  }

  public saveToken(token: string): void {
    if (!this.isBrowser()) return;

    localStorage.setItem(this.tokenKey, token.trim());
  }

  public getToken(): string | null {
    if (!this.isBrowser()) return null;

    const token = localStorage.getItem(this.tokenKey);
    return token ? token.trim() : null;
  }

  public saveUserProfile(profile: UserProfile): void {
    if (!this.isBrowser()) return;

    localStorage.setItem(this.profileKey, JSON.stringify(profile));
  }

  public async saveOfflineLogin(
    userid: string,
    password: string,
    token: string,
    hash: string | undefined,
    profile: UserProfile,
  ): Promise<void> {
    if (!this.isBrowser()) return;

    const passwordHash = await this.createPasswordHash(userid, password);

    localStorage.setItem(
      this.offlineLoginKey,
      JSON.stringify({
        userid,
        passwordHash,
        token: token.trim(),
        hash,
        profile,
      }),
    );
  }

  public async loginOffline(userid: string, password: string): Promise<boolean> {
    if (!this.isBrowser()) return false;

    const cachedLogin = localStorage.getItem(this.offlineLoginKey);

    if (!cachedLogin) return false;

    try {
      const parsed = JSON.parse(cachedLogin) as {
        userid?: string;
        passwordHash?: string;
        token?: string;
        profile?: UserProfile;
      };

      const passwordHash = await this.createPasswordHash(userid, password);

      if (
        parsed.userid !== userid ||
        parsed.passwordHash !== passwordHash ||
        !parsed.token ||
        !parsed.profile
      ) {
        return false;
      }

      this.saveToken(parsed.token);
      this.saveUserProfile(parsed.profile);
      return true;
    } catch {
      return false;
    }
  }

  public getUserProfile(): UserProfile | null {
    if (!this.isBrowser()) return null;

    const profile = localStorage.getItem(this.profileKey);
    return profile ? JSON.parse(profile) : null;
  }

  public clearToken(): void {
    if (!this.isBrowser()) return;

    localStorage.removeItem(this.tokenKey);
  }

  public clearUserProfile(): void {
    if (!this.isBrowser()) return;

    localStorage.removeItem(this.profileKey);
  }

  public clearAll(): void {
    if (!this.isBrowser()) return;

    this.clearSession();
    localStorage.removeItem(this.offlineLoginKey);
  }

  public clearSession(): void {
    if (!this.isBrowser()) return;

    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.profileKey);
  }

  public getCurrentUserHash(): string | null {
    return this.getUserProfile()?.hash ?? null;
  }

  public isLoggedIn(): boolean {
    return !!this.getToken();
  }

  private async createPasswordHash(userid: string, password: string): Promise<string> {
    const data = new TextEncoder().encode(`${userid}:${password}`);
    const buffer = await crypto.subtle.digest('SHA-256', data);

    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}
