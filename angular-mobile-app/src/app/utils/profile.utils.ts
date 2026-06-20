import { Chat } from '../models/chat/chat';
import { ApiMessage } from '../models/message/api-message';
import { ApiProfile } from '../models/profile/api-profile';

export type LooseProfile = Partial<ApiProfile> & {
  id?: string;
  userhash?: string;
  username?: string;
  usernick?: string;
  userfullname?: string;
};

export function normalizeProfile(profile: LooseProfile | undefined): ApiProfile | null {
  if (!profile) return null;

  const hash = profile.hash || profile.userhash || profile.userid || profile.id;
  const userid = profile.userid || profile.username || profile.id || hash;
  const nickname =
    profile.nickname || profile.usernick || profile.username || profile.fullname || userid || hash;
  const fullname = profile.fullname || profile.userfullname || nickname;

  if (!hash && !userid && !nickname && !fullname) return null;

  return {
    userid: userid || getShortHash(hash),
    nickname: nickname || getShortHash(hash),
    fullname: fullname || nickname || getShortHash(hash),
    hash: hash || userid || nickname || fullname || 'Unknown',
  };
}

export function getProfileFromMessage(message: ApiMessage): ApiProfile | null {
  return normalizeProfile({
    userid: message.userid,
    nickname: message.usernick,
    username: message.username,
    fullname: message.userfullname,
    hash: message.userhash,
  });
}

export function getChatMembers(chat: Chat | undefined, messages: ApiMessage[] = []): ApiProfile[] {
  const members = [...(chat?.participants ?? [])]
    .map((profile) => normalizeProfile(profile))
    .filter((profile): profile is ApiProfile => !!profile);

  const owner = normalizeProfile(chat?.owner);

  if (owner) {
    members.unshift(owner);
  }

  for (const message of messages) {
    const profile = getProfileFromMessage(message);

    if (profile) {
      members.push(profile);
    }
  }

  const uniqueMembers = new Map<string, ApiProfile>();

  for (const member of members) {
    uniqueMembers.set(getProfileKey(member), member);
  }

  return [...uniqueMembers.values()];
}

export function getProfileDisplayName(profile: ApiProfile): string {
  return profile.nickname || profile.fullname || profile.userid || getShortHash(profile.hash);
}

export function getProfileInitial(profile: ApiProfile): string {
  return (getProfileDisplayName(profile).charAt(0) || '?').toUpperCase();
}

export function getMemberRole(profile: ApiProfile, chat?: Chat): string {
  if (chat?.owner?.hash && profile.hash === chat.owner.hash) return 'Owner';
  if (chat?.owner?.userid && profile.userid === chat.owner.userid) return 'Owner';

  return 'Member';
}

export function getProfileKey(profile: ApiProfile): string {
  return profile.hash || profile.userid || profile.nickname || profile.fullname;
}

export function getShortHash(hash?: string): string {
  return hash ? hash.slice(0, 8) : 'Unknown';
}
