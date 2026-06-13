import { Invitation } from './invitation';

export interface InvitesResponse {
  status: string;
  message?: string;
  code?: number;
  invites?: Invitation[];
}