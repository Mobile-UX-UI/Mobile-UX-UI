import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
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
      headers: this.getCacheHeaders(options),
    });
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
      headers: this.getCacheHeaders(options),
      responseType: 'blob',
    });
  }

  private getCacheHeaders(options?: { noCache?: boolean }): HttpHeaders | undefined {
    if (!options?.noCache) return undefined;

    return new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
  }
}
