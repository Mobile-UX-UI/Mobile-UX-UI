import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';
import { AuthResponse } from '../../models/auth/auth-response.model';
import { isPlatformBrowser } from '@angular/common';
import { UserProfile } from '../../models/profile/user-profile';
import { GetProfilesResponse } from '../../models/profile/get-profiles-response';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);

  private readonly tokenKey = 'auth_token';
  private readonly profileKey = 'user_profile';

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

  public validateToken(): Observable<AuthResponse> | null {
    const token = this.getToken();

    if (!token) return null;

    return this.api.get<AuthResponse>('validatetoken', { token }, { noCache: true });
  }

  public getProfiles(): Observable<GetProfilesResponse> | null {
    const token = this.getToken();

    if (!token) return null;

    return this.api.get<GetProfilesResponse>('getprofiles', { token }, { noCache: true });
  }

  public logout(): Observable<AuthResponse> | null {
    const token = this.getToken();

    if (!token) return null;

    return this.api.get<AuthResponse>('logout', { token }, { noCache: true });
  }

  public deregister(): Observable<AuthResponse> | null {
    const token = this.getToken();

    if (!token) return null;

    return this.api.get<AuthResponse>('deregister', { token }, { noCache: true });
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

    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.profileKey);
  }

  public isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
