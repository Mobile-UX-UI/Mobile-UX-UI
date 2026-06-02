import { Chat } from './chat';

export interface ChatsResponse {
  status: string;
  message?: string;
  code?: number;
  chats?: Chat[];
}
