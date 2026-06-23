import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  public get<T>(
    request: string,
    params?: Record<string, string | number | boolean>,
    options?: { noCache?: boolean },
  ): Observable<T> {
    let httpParams = new HttpParams().set('request', request);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        httpParams = httpParams.set(key, String(value));
      }
    }

    if (options?.noCache) {
      httpParams = httpParams.set('_', Date.now().toString());
    }

    return this.http.get<T>(this.baseUrl, {
      params: httpParams,
    });
  }

  public buildGetUrl(
    request: string,
    params?: Record<string, string | number | boolean>,
    options?: { noCache?: boolean },
  ): string {
    const url = new URL(this.baseUrl, globalThis.location?.origin ?? 'http://localhost');
    url.searchParams.set('request', request);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
    }

    if (options?.noCache) {
      url.searchParams.set('_', Date.now().toString());
    }

    return url.toString();
  }

  public post<T>(request: string, body?: Record<string, unknown>): Observable<T> {
    return this.http.post<T>(this.baseUrl, {
      request,
      ...body,
    });
  }

  public getBlob(
    request: string,
    params?: Record<string, string | number | boolean>,
    options?: { noCache?: boolean },
  ): Observable<Blob> {
    let httpParams = new HttpParams().set('request', request);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        httpParams = httpParams.set(key, String(value));
      }
    }

    if (options?.noCache) {
      httpParams = httpParams.set('_', Date.now().toString());
    }

    return this.http.get(this.baseUrl, {
      params: httpParams,
      responseType: 'blob',
    });
  }
}
