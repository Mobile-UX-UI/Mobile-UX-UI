import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../api/api.service';
import { StatusResponse } from '../../models/common/status-response';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private api = inject(ApiService);

  public resetUser(token: string, key: string, userhash: string): Observable<StatusResponse> {
    return this.api.get<StatusResponse>('resetuser', { token, key, userhash }, { noCache: true });
  }

  public deleteUser(token: string, key: string, userhash: string): Observable<StatusResponse> {
    return this.api.get<StatusResponse>('deleteuser', { token, key, userhash }, { noCache: true });
  }

  public clear(key: string): Observable<StatusResponse> {
    return this.api.get<StatusResponse>('clear', { key }, { noCache: true });
  }
}
