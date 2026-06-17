import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { BottomNavbar } from '../../components/bottom-navbar/bottom-navbar';
import { ChatListItem } from '../../components/chat-list-item/chat-list-item';

import { ChatService } from '../../services/chat/chat.service';
import { MessageService } from '../../services/message/message.service';
import { AuthService } from '../../services/auth/auth.service';

import { Chat } from '../../models/chat/chat';
import { ApiMessage } from '../../models/message/api-message';
import { ApiProfile } from '../../models/profile/api-profile';

type ChatListMetadata = {
  lastMessage?: ApiMessage;
  lastMessageText: string;
  lastMessageTime: number;
  unreadCount: number;
  hasUnreadMessages: boolean;
};

type ChatReadState = Record<string, { lastMessageId?: string; lastMessageTime?: string }>;
type LooseProfile = Partial<ApiProfile> & {
  id?: string;
  userhash?: string;
  username?: string;
  usernick?: string;
  userfullname?: string;
};

@Component({
  selector: 'app-chat-list-page',
  imports: [BottomNavbar, FormsModule, MatIconModule, ChatListItem],
  templateUrl: './chat-list-page.html',
  styleUrl: './chat-list-page.css',
})
export class ChatListPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private chatService = inject(ChatService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  private readonly cachedChatsKey = 'cached_chats';
  private readonly chatDraftsKey = 'chat_drafts';
  private readonly chatReadStateKey = 'chat_read_state';
  private readonly apiRetryDelayMs = 60000;
  private refreshIntervalId?: ReturnType<typeof setInterval>;
  private apiRetryAfter = 0;

  chats: Chat[] = [];
  chatMetadata: Record<string, ChatListMetadata> = {};
  searchText = '';

  isOfflineMode = false;
  connectionMessage = '';
  selectedMembersChat?: Chat;
  selectedMemberProfile?: ApiProfile;

  ngOnInit(): void {
    this.loadChats();
    this.refreshIntervalId = setInterval(() => this.loadChats(), 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
  }

  loadChats(): void {
    if (Date.now() < this.apiRetryAfter) {
      return;
    }

    const request = this.chatService.getChats();

    if (!request) {
      this.loadCachedChats();
      return;
    }

    request.subscribe({
      next: (response) => {
        this.chats = [...(response.chats ?? [])];
        this.isOfflineMode = false;
        this.connectionMessage = '';

        localStorage.setItem(this.cachedChatsKey, JSON.stringify(this.chats));

        this.loadChatMetadata();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Get chats error:', error);
        this.apiRetryAfter = Date.now() + this.apiRetryDelayMs;
        this.loadCachedChats();
      },
    });
  }

  loadCachedChats(): void {
    const cachedChats = localStorage.getItem(this.cachedChatsKey);

    if (!cachedChats) {
      this.chats = [];
      this.isOfflineMode = true;
      this.connectionMessage = this.getConnectionFallbackMessage();
      return;
    }

    try {
      this.chats = JSON.parse(cachedChats) as Chat[];
      this.isOfflineMode = true;
      this.connectionMessage = this.getConnectionFallbackMessage();
      this.loadChatMetadataFromCache();
    } catch {
      this.chats = [];
      this.isOfflineMode = true;
      this.connectionMessage = this.getConnectionFallbackMessage();
    }

    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  get filteredChats(): Chat[] {
    const search = this.searchText.toLowerCase().trim();
    const sortedChats = this.getSortedChats(this.chats);

    if (!search) {
      return sortedChats;
    }

    return sortedChats.filter((chat) => chat.chatname.toLowerCase().includes(search));
  }

  onCreateGroup(): void {
    this.router.navigate(['/chats/new']);
  }

  openChat(chat: Chat): void {
    if (!chat.joined) {
      return;
    }

    this.markChatAsRead(chat.chatid);
    this.router.navigate(['/chats', chat.chatid]);
  }

  openChatMembers(chat: Chat): void {
    this.selectedMembersChat = chat;
    this.selectedMemberProfile = undefined;
  }

  closeChatMembers(): void {
    this.selectedMembersChat = undefined;
    this.selectedMemberProfile = undefined;
  }

  openMemberProfile(profile: ApiProfile): void {
    this.selectedMemberProfile = profile;
  }

  closeMemberProfile(): void {
    this.selectedMemberProfile = undefined;
  }

  getLastMessageText(chatid: string): string {
    return this.chatMetadata[String(chatid)]?.lastMessageText ?? '';
  }

  getUnreadCount(chatid: string): number {
    return this.chatMetadata[String(chatid)]?.unreadCount ?? 0;
  }

  hasUnreadMessages(chatid: string): boolean {
    return this.chatMetadata[String(chatid)]?.hasUnreadMessages ?? false;
  }

  getDraftText(chatid: string): string {
    const drafts = this.getDrafts();
    return drafts[String(chatid)] ?? '';
  }

  getMembers(chat: Chat): ApiProfile[] {
    const members = [...(chat.participants ?? [])]
      .map((profile) => this.normalizeProfile(profile))
      .filter((profile): profile is ApiProfile => !!profile);

    if (chat.owner) {
      const owner = this.normalizeProfile(chat.owner);

      if (owner) {
        members.unshift(owner);
      }
    }

    for (const message of this.getCachedMessages(chat.chatid)) {
      const profile = this.getProfileFromMessage(message);

      if (profile) {
        members.push(profile);
      }
    }

    const uniqueMembers = new Map<string, ApiProfile>();

    for (const member of members) {
      uniqueMembers.set(this.getProfileKey(member), member);
    }

    return [...uniqueMembers.values()];
  }

  getProfileDisplayName(profile: ApiProfile): string {
    return profile.nickname || profile.fullname || profile.userid || this.getShortHash(profile.hash);
  }

  getProfileInitial(profile: ApiProfile): string {
    return (this.getProfileDisplayName(profile).charAt(0) || '?').toUpperCase();
  }

  getMemberRole(profile: ApiProfile, chat?: Chat): string {
    if (chat?.owner?.hash && profile.hash === chat.owner.hash) {
      return 'Owner';
    }

    if (chat?.owner?.userid && profile.userid === chat.owner.userid) {
      return 'Owner';
    }

    return 'Member';
  }

  private getDrafts(): Record<string, string> {
    const savedDrafts = localStorage.getItem(this.chatDraftsKey);

    if (!savedDrafts) return {};

    try {
      return JSON.parse(savedDrafts) as Record<string, string>;
    } catch {
      return {};
    }
  }

  private loadChatMetadata(): void {
    this.loadChatMetadataFromCache();

    for (const chat of this.chats) {
      if (!chat.joined) {
        continue;
      }

      const request = this.messageService.getMessages(undefined, chat.chatid);

      if (!request) {
        continue;
      }

      request.subscribe({
        next: (response) => {
          const messages = response.messages ?? [];

          localStorage.setItem(this.getCachedMessagesKey(chat.chatid), JSON.stringify(messages));

          this.chatMetadata = {
            ...this.chatMetadata,
            [String(chat.chatid)]: this.createChatMetadata(chat.chatid, messages),
          };

          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Get chat messages metadata error:', error);
        },
      });
    }
  }

  private loadChatMetadataFromCache(): void {
    const metadata: Record<string, ChatListMetadata> = {};

    for (const chat of this.chats) {
      metadata[String(chat.chatid)] = this.createChatMetadata(
        chat.chatid,
        this.getCachedMessages(chat.chatid),
      );
    }

    this.chatMetadata = metadata;
  }

  private createChatMetadata(chatid: string, messages: ApiMessage[]): ChatListMetadata {
    const sortedMessages = [...messages].sort(
      (a, b) => this.getMessageTimestamp(a.time) - this.getMessageTimestamp(b.time),
    );
    const lastMessage = sortedMessages.at(-1);

    const unreadCount = this.countUnreadMessages(chatid, sortedMessages);
    const hasUnreadMessages = unreadCount > 0 || this.hasUnreadLatestMessage(chatid, lastMessage);

    return {
      lastMessage,
      lastMessageText: lastMessage ? this.getMessagePreview(lastMessage) : '',
      lastMessageTime: lastMessage ? this.getMessageTimestamp(lastMessage.time) : 0,
      unreadCount,
      hasUnreadMessages,
    };
  }

  private countUnreadMessages(chatid: string, messages: ApiMessage[]): number {
    const readMarker = this.getChatReadState()[String(chatid)];

    if (!readMarker) return 0;

    const currentUserHash = this.authService.getCurrentUserHash();
    const readMessageIndex = messages.findIndex((message) => message.id === readMarker.lastMessageId);

    if (readMessageIndex >= 0) {
      return messages.slice(readMessageIndex + 1).filter((message) => {
        const isOwnMessage = currentUserHash && message.userhash === currentUserHash;
        return !isOwnMessage;
      }).length;
    }

    const readTime = readMarker.lastMessageTime
      ? this.getMessageTimestamp(readMarker.lastMessageTime)
      : 0;

    return messages.filter((message) => {
      const isOwnMessage = currentUserHash && message.userhash === currentUserHash;
      return !isOwnMessage && this.getMessageTimestamp(message.time) > readTime;
    }).length;
  }

  private hasUnreadLatestMessage(chatid: string, lastMessage?: ApiMessage): boolean {
    if (!lastMessage) return false;

    const currentUserHash = this.authService.getCurrentUserHash();

    if (currentUserHash && lastMessage.userhash === currentUserHash) {
      return false;
    }

    const readMarker = this.getChatReadState()[String(chatid)];

    if (!readMarker) return true;

    if (readMarker.lastMessageId && lastMessage.id) {
      return readMarker.lastMessageId !== lastMessage.id;
    }

    if (!readMarker.lastMessageTime) return false;

    return this.getMessageTimestamp(lastMessage.time) > this.getMessageTimestamp(readMarker.lastMessageTime);
  }

  private markChatAsRead(chatid: string): void {
    const lastMessage =
      this.chatMetadata[String(chatid)]?.lastMessage ?? this.getCachedMessages(chatid).at(-1);

    if (!lastMessage) return;

    this.saveChatReadMarker(chatid, lastMessage);

    const metadata = this.chatMetadata[String(chatid)];

    if (metadata) {
      this.chatMetadata = {
        ...this.chatMetadata,
        [String(chatid)]: {
          ...metadata,
          unreadCount: 0,
          hasUnreadMessages: false,
        },
      };
    }
  }

  private saveChatReadMarker(chatid: string, message: ApiMessage): void {
    const readState = this.getChatReadState();

    readState[String(chatid)] = {
      lastMessageId: message.id,
      lastMessageTime: message.time,
    };

    localStorage.setItem(this.chatReadStateKey, JSON.stringify(readState));
  }

  private getSortedChats(chats: Chat[]): Chat[] {
    return [...chats].sort((a, b) => {
      const aTime = this.chatMetadata[String(a.chatid)]?.lastMessageTime ?? 0;
      const bTime = this.chatMetadata[String(b.chatid)]?.lastMessageTime ?? 0;

      if (aTime !== bTime) {
        return bTime - aTime;
      }

      return a.chatname.localeCompare(b.chatname);
    });
  }

  private getMessagePreview(message: ApiMessage): string {
    if (message.text?.trim()) {
      return message.text.trim();
    }

    if (message.photoid) {
      return 'Photo';
    }

    if (message.position) {
      return 'Location';
    }

    return 'New message';
  }

  private getProfileFromMessage(message: ApiMessage): ApiProfile | null {
    return this.normalizeProfile({
      userid: message.userid,
      nickname: message.usernick,
      username: message.username,
      fullname: message.userfullname,
      hash: message.userhash,
    });
  }

  private normalizeProfile(profile: LooseProfile | undefined): ApiProfile | null {
    if (!profile) {
      return null;
    }

    const hash = profile.hash || profile.userhash || profile.userid || profile.id;
    const userid = profile.userid || profile.username || profile.id || hash;
    const nickname =
      profile.nickname || profile.usernick || profile.username || profile.fullname || userid || hash;
    const fullname = profile.fullname || profile.userfullname || nickname;

    if (!hash && !userid && !nickname && !fullname) {
      return null;
    }

    return {
      userid: userid || this.getShortHash(hash),
      nickname: nickname || this.getShortHash(hash),
      fullname: fullname || nickname || this.getShortHash(hash),
      hash: hash || userid || nickname || fullname || 'Unknown',
    };
  }

  private getProfileKey(profile: ApiProfile): string {
    return profile.hash || profile.userid || profile.nickname || profile.fullname;
  }

  private getShortHash(hash?: string): string {
    return hash ? hash.slice(0, 8) : 'Unknown';
  }

  private getCachedMessages(chatid: string): ApiMessage[] {
    const cachedMessages = localStorage.getItem(this.getCachedMessagesKey(chatid));

    if (!cachedMessages) return [];

    try {
      return JSON.parse(cachedMessages) as ApiMessage[];
    } catch {
      return [];
    }
  }

  private getCachedMessagesKey(chatid: string): string {
    return `cached_messages_${chatid}`;
  }

  private getChatReadState(): ChatReadState {
    const savedState = localStorage.getItem(this.chatReadStateKey);

    if (!savedState) return {};

    try {
      return JSON.parse(savedState) as ChatReadState;
    } catch {
      return {};
    }
  }

  private getMessageTimestamp(time: string): number {
    const match = time.match(/^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})$/);

    if (match) {
      const [, datePart, hours, minutes, seconds] = match;
      const date = new Date(`${datePart}T${hours}:${minutes}:${seconds}`);

      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    }

    const date = new Date(time);

    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  private getConnectionFallbackMessage(): string {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'Offline';
    }

    return 'Server/API nicht erreichbar';
  }
}
