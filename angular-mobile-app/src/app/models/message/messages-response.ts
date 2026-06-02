import { ApiMessage } from './api-message';

export interface MessagesResponse {
  status: string;
  message?: string;
  code?: number;
  messages?: ApiMessage[];
}
