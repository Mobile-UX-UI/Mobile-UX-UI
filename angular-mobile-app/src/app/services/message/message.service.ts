import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../api/api.service';
import { AuthService } from '../auth/auth.service';
import { MessagesResponse } from '../../models/message/messages-response';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  public getMessages(
    fromid?: string,
    chatid?: string,
    key?: string,
  ): Observable<MessagesResponse> | null {
    const token = this.auth.getToken();

    if (!token) {
      return null;
    }

    const params: Record<string, string> = { token };

    if (fromid) {
      params['fromid'] = fromid;
    }

    if (chatid) {
      params['chatid'] = chatid;
    }

    if (key) {
      params['key'] = key;
    }

    return this.api.get<MessagesResponse>('getmessages', params, { noCache: true });
  }

  public getPhoto(photoid: string): Observable<Blob> | null {
    const token = this.auth.getToken();

    if (!token) {
      return null;
    }

    return this.api.getBlob('getphoto', { token, photoid }, { noCache: true });
  }
}
