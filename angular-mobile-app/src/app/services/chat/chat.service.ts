import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../api/api.service';
import { AuthService } from '../auth/auth.service';
import { ChatsResponse } from '../../models/chat/chats-response';
import { CreateChatResponse } from '../../models/chat/create-chat-response';
import { StatusResponse } from '../../models/common/status-response';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  public getChats(key?: string): Observable<ChatsResponse> | null {
    const token = this.auth.getToken();

    if (!token) {
      return null;
    }

    const params: Record<string, string> = { token };

    if (key) {
      params['key'] = key;
    }

    return this.api.get<ChatsResponse>('getchats', params, { noCache: true });
  }

  public createChat(chatname: string, ispublic: boolean): Observable<CreateChatResponse> | null {
    const token = this.auth.getToken();

    if (!token) {
      return null;
    }

    const params: Record<string, string> = {
      token,
      chatname,
      ispublic: ispublic ? 'true' : 'false',
    };

    console.log('createChat params:', params);

    return this.api.get<CreateChatResponse>('createchat', params, { noCache: true });
  }

  public deleteChat(chatid: string, key?: string): Observable<StatusResponse> | null {
    const token = this.auth.getToken();

    if (!token) {
      return null;
    }

    const params: Record<string, string> = {
      token,
      chatid,
    };

    if (key) {
      params['key'] = key;
    }

    return this.api.get<StatusResponse>('deletechat', params, { noCache: true });
  }

  public joinChat(chatid: string): Observable<StatusResponse> | null {
    const token = this.auth.getToken();

    if (!token) {
      return null;
    }

    return this.api.get<StatusResponse>('joinchat', { token, chatid }, { noCache: true });
  }

  public leaveChat(chatid: string): Observable<StatusResponse> | null {
    const token = this.auth.getToken();

    if (!token) {
      return null;
    }

    return this.api.get<StatusResponse>('leavechat', { token, chatid }, { noCache: true });
  }
}
