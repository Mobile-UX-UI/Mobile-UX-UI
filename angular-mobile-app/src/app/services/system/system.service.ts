import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../api/api.service';
import { StatusResponse } from '../../models/common/status-response';

@Injectable({
  providedIn: 'root',
})
export class SystemService {
  private api = inject(ApiService);

  public ping(): Observable<StatusResponse> {
    return this.api.get<StatusResponse>('ping', undefined, { noCache: true });
  }
}
