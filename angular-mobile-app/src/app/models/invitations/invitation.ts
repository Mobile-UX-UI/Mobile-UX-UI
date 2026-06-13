import { ApiProfile } from '../profile/api-profile';

export interface Invitation {
  chatid: string;
  chatname: string;
  owner: ApiProfile;
}