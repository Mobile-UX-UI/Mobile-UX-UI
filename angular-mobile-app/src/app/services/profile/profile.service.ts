import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../api/api.service';
import { AuthService } from '../auth/auth.service';
import { GetProfilesResponse } from '../../models/profile/get-profiles-response';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  public getProfiles(key?: string): Observable<GetProfilesResponse> | null {
    const token = this.auth.getToken();

    if (!token) {
      return null;
    }

    const params: Record<string, string> = { token };

    if (key) {
      params['key'] = key;
    }

    return this.api.get<GetProfilesResponse>('getprofiles', params, { noCache: true });
  }
}
