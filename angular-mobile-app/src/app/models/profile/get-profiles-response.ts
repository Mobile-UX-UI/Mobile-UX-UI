import { ApiProfile } from './api-profile';

export interface GetProfilesResponse {
  status: string;
  message?: string;
  code: number;
  profiles?: ApiProfile[];
}
