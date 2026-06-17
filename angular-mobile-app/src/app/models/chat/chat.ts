import { ApiProfile } from '../profile/api-profile';

export interface Chat {
  chatid: string;
  chatname: string;
  visibility: 'public' | 'private';
  role: 'owner' | 'member' | 'invited' | 'admin' | 'none';
  joined: boolean;
  directchat?: boolean;
  owner?: ApiProfile;
  participants?: ApiProfile[];
  invited?: ApiProfile[];
}
