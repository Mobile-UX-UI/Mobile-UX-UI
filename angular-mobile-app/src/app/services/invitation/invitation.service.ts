import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../api/api.service';
import { AuthService } from '../auth/auth.service';

import { InvitesResponse } from '../../models/invitations/invites-response';
import { StatusResponse } from '../../models/common/status-response';

@Injectable({
  providedIn: 'root',
})
export class InvitationService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  public getInvites(): Observable<InvitesResponse> | null {
    const token = this.auth.getToken();

    if (!token) {
      return null;
    }

    return this.api.get<InvitesResponse>('getinvites', { token }, { noCache: true });
  }

  public sendInvite(
    chatid: string,
    invitedhash: string,
    key?: string,
  ): Observable<StatusResponse> | null {
    const token = this.auth.getToken();

    if (!token) {
      return null;
    }

    const params: Record<string, string> = {
      token,
      chatid,
      invitedhash,
    };

    if (key) {
      params['key'] = key;
    }

    return this.api.get<StatusResponse>('invite', params, { noCache: true });
  }

  public acceptInvite(chatid: string): Observable<StatusResponse> | null {
    const token = this.auth.getToken();

    if (!token) {
      return null;
    }

    return this.api.get<StatusResponse>('joinchat', { token, chatid }, { noCache: true });
  }

  public declineInvite(chatid: string): Observable<StatusResponse> | null {
    const token = this.auth.getToken();

    if (!token) {
      return null;
    }

    return this.api.get<StatusResponse>('rejectinvite', { token, chatid }, { noCache: true });
  }
}
