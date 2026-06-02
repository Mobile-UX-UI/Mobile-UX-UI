export interface ApiMessage {
  id: string;
  userid: string;
  time: string;
  chatid: string;

  text?: string;
  photoid?: string;
  position?: string;
  important?: boolean;

  usernick?: string;
  userhash?: string;

  username?: string;
  userfullname?: string;
}
