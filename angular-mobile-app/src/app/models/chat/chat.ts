export interface Chat {
  chatid: string;
  chatname: string;
  visibility: 'public' | 'private';
  role: 'owner' | 'member' | 'invited' | 'admin' | 'none';
  joined: boolean;
}
