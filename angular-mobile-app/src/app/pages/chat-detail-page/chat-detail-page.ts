import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';

import { MembersDialog } from '../../components/members-dialog/members-dialog';
import { ApiMessage } from '../../models/message/api-message';
import { Chat } from '../../models/chat/chat';
import { ChatService } from '../../services/chat/chat.service';
import { MessageService } from '../../services/message/message.service';
import { AuthService } from '../../services/auth/auth.service';
import { environment } from '../../../environments/environment';
import { getChatMembers, getProfileDisplayName } from '../../utils/profile.utils';

type PendingMessage = {
  clientId: string;
  text?: string;
  photo?: string;
  file?: string;
  fileName?: string;
  position?: string;
  createdAt: string;
};

type ChatMessage = ApiMessage & {
  pending?: boolean;
  clientId?: string;
  photoPreviewUrl?: string;
  filePreviewName?: string;
};

@Component({
  selector: 'app-chat-detail-page',
  imports: [FormsModule, MatIconModule, MembersDialog],
  templateUrl: './chat-detail-page.html',
  styleUrl: './chat-detail-page.css',
})
export class ChatDetailPage implements OnInit, OnDestroy {
  @ViewChild('messagesContainer')
  messagesContainer?: ElementRef<HTMLDivElement>;

  @ViewChild('cameraPreview')
  cameraPreview?: ElementRef<HTMLVideoElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private chatService = inject(ChatService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private readonly chatDraftsKey = 'chat_drafts';
  private readonly pendingMessagesKey = 'pending_messages';
  private readonly chatReadStateKey = 'chat_read_state';
  private readonly cachedChatsKey = 'cached_chats';
  private readonly chatApiRetryAfterKey = 'chat_api_retry_after';
  private readonly failedPhotoIdsKey = 'failed_photo_ids';
  private readonly apiRetryDelayMs = 60000;
  private readonly handleOnline = () => this.flushPendingMessages();
  private isFlushingPendingMessages = false;

  chatid = '';
  chat?: Chat;

  messages: ChatMessage[] = [];
  newMessageText = '';

  selectedPhotoBase64 = '';
  selectedFileBase64 = '';
  selectedFileName = '';
  selectedImagePreviewUrl = '';
  photoUrls: Record<string, string> = {};

  isCameraOpen = false;
  isAttachmentMenuOpen = false;

  isChatMenuOpen = false;
  isMembersListOpen = false;
  actionMessage = '';

  private cameraStream?: MediaStream;

  ngOnInit(): void {
    this.chatid = this.route.snapshot.paramMap.get('chatid') ?? '';
    this.newMessageText = this.getDraftText();
    this.loadChat();
    this.loadMessages();
    this.addOnlineListener();
    this.flushPendingMessages();
  }

  ngOnDestroy(): void {
    this.saveDraft();
    this.closeCamera();
    this.removeOnlineListener();

    Object.values(this.photoUrls).forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }

  loadChat(): void {
    this.loadCachedChat();

    if (Date.now() < this.getRetryAfter(this.chatApiRetryAfterKey)) {
      return;
    }

    const request = this.chatService.getChats();

    if (!request) {
      return;
    }

    request.subscribe({
      next: (response) => {
        this.chat = response.chats?.find((chat) => String(chat.chatid) === String(this.chatid));
        localStorage.setItem(this.cachedChatsKey, JSON.stringify(response.chats ?? []));
        localStorage.removeItem(this.chatApiRetryAfterKey);
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        console.error('Load chat error:', error);
        this.setRetryAfter(this.chatApiRetryAfterKey, this.apiRetryDelayMs);
        this.loadCachedChat();
      },
    });
  }

  private loadCachedChat(): void {
    const cachedChats = localStorage.getItem(this.cachedChatsKey);

    if (!cachedChats) return;

    try {
      const chats = JSON.parse(cachedChats) as Chat[];
      this.chat = chats.find((chat) => String(chat.chatid) === String(this.chatid));
      this.cdr.detectChanges();
    } catch {
      this.chat = undefined;
    }
  }

  loadMessages(): void {
    const request = this.messageService.getMessages(undefined, this.chatid);

    if (!request) {
      this.loadCachedMessages();
      return;
    }

    request.subscribe({
      next: (response) => {
        this.messages = this.withPendingMessages([...(response.messages ?? [])]);
        console.log(
          'Saving messages under key:',
          this.getCachedMessagesKey(),
          response.messages?.length ?? 0,
        );

        localStorage.setItem(
          this.getCachedMessagesKey(),
          JSON.stringify(response.messages ?? []),
        );

        this.markChatAsRead(response.messages ?? []);
        this.loadPhotos();
        this.cdr.detectChanges();

        setTimeout(() => {
          this.scrollToBottom();
        }, 0);
      },
      error: (error: unknown) => {
        console.error('Get messages error:', error);
        this.loadCachedMessages();
      },
    });
  }

  private loadCachedMessages(): void {
    const cachedMessages = localStorage.getItem(this.getCachedMessagesKey());

    if (!cachedMessages) {
      this.messages = this.withPendingMessages([]);
      this.cdr.detectChanges();
      return;
    }

    try {
      const parsedMessages = JSON.parse(cachedMessages) as ApiMessage[];
      this.messages = this.withPendingMessages(parsedMessages);
      this.markChatAsRead(parsedMessages);
    } catch {
      this.messages = this.withPendingMessages([]);
    }

    this.cdr.detectChanges();

    setTimeout(() => {
      this.scrollToBottom();
    }, 0);
  }

  private getCachedMessagesKey(): string {
    return `cached_messages_${this.chatid}`;
  }

  private getPendingMessagesKey(): string {
    return `${this.pendingMessagesKey}_${this.chatid}`;
  }

  loadPhotos(): void {
    const failedPhotoIds = this.getFailedPhotoIds();

    for (const message of this.messages) {
      if (!message.photoid || this.photoUrls[message.photoid] || failedPhotoIds.includes(message.photoid)) {
        continue;
      }

      const photoUrl = this.messageService.getPhotoUrl(message.photoid);

      if (photoUrl) {
        this.photoUrls[message.photoid] = photoUrl;
      }
    }
  }

  isPhotoUnavailable(photoid: string): boolean {
    return this.getFailedPhotoIds().includes(photoid);
  }

  markPhotoUnavailable(photoid: string): void {
    this.saveFailedPhotoId(photoid);
    delete this.photoUrls[photoid];
    this.cdr.detectChanges();
  }

  toggleAttachmentMenu(): void {
    this.isAttachmentMenuOpen = !this.isAttachmentMenuOpen;
    this.isChatMenuOpen = false;
  }

  toggleChatMenu(): void {
    this.isChatMenuOpen = !this.isChatMenuOpen;
    this.isAttachmentMenuOpen = false;
  }

  openMembersList(): void {
    this.isMembersListOpen = true;
    this.isChatMenuOpen = false;
    this.isAttachmentMenuOpen = false;
  }

  closeMembersList(): void {
    this.isMembersListOpen = false;
  }

  openImagePreview(imageUrl: string): void {
    this.selectedImagePreviewUrl = imageUrl;
    this.isAttachmentMenuOpen = false;
    this.isChatMenuOpen = false;
  }

  closeImagePreview(): void {
    this.selectedImagePreviewUrl = '';
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      this.selectedPhotoBase64 = reader.result as string;
      this.isAttachmentMenuOpen = false;
      this.cdr.detectChanges();
    };

    reader.readAsDataURL(file);
    input.value = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      this.selectedFileBase64 = reader.result as string;
      this.selectedFileName = file.name;
      this.isAttachmentMenuOpen = false;
      this.cdr.detectChanges();
    };

    reader.readAsDataURL(file);
    input.value = '';
  }

  async openCamera(): Promise<void> {
    try {
      this.isAttachmentMenuOpen = false;

      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
        },
        audio: false,
      });

      this.isCameraOpen = true;
      this.cdr.detectChanges();

      setTimeout(() => {
        if (this.cameraPreview?.nativeElement && this.cameraStream) {
          this.cameraPreview.nativeElement.srcObject = this.cameraStream;
        }
      }, 0);
    } catch (error: unknown) {
      console.error('Camera access error:', error);
    }
  }

  takePhoto(): void {
    const video = this.cameraPreview?.nativeElement;

    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');

    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.selectedPhotoBase64 = canvas.toDataURL('image/png');

    this.closeCamera();
    this.cdr.detectChanges();
  }

  closeCamera(): void {
    this.cameraStream?.getTracks().forEach((track) => track.stop());
    this.cameraStream = undefined;
    this.isCameraOpen = false;
    this.cdr.detectChanges();
  }

  shareLocation(): void {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (location) => {
        const position = `${location.coords.latitude},${location.coords.longitude}`;

        const request = this.messageService.postMessage(
          undefined,
          this.chatid,
          undefined,
          position,
        );

        if (!request) {
          return;
        }

        request.subscribe({
          next: () => {
            this.isAttachmentMenuOpen = false;
            this.loadMessages();
          },
          error: (error: unknown) => {
            console.error('Post location error:', error);
          },
        });
      },
      (error: GeolocationPositionError) => {
        console.error('Location error:', error);
        this.isAttachmentMenuOpen = false;
        this.cdr.detectChanges();
      },
    );
  }

  sendLocation(latitude: number, longitude: number): void {
    const position = `${latitude},${longitude}`;
    const request = this.messageService.postMessage(undefined, this.chatid, undefined, position);

    if (!request) return;

    request.subscribe({
      next: () => {
        this.isAttachmentMenuOpen = false;
        this.loadMessages();
      },
      error: (error: unknown) => {
        console.error('Post location error:', error);
      },
    });
  }

  getMapImageUrl(position: string): string {
    const encodedPosition = encodeURIComponent(position);

    return `https://maps.googleapis.com/maps/api/staticmap?center=${encodedPosition}&zoom=16&size=500x300&markers=color:red%7C${encodedPosition}&key=${environment.googleMapsApiKey}`;
  }

  hasGoogleMapsApiKey(): boolean {
    return Boolean(
      environment.googleMapsApiKey &&
        environment.googleMapsApiKey !== 'YOUR_GOOGLE_MAPS_API_KEY',
    );
  }

  openMap(position: string): void {
    window.open(`https://maps.google.com/?q=${position}`, '_blank');
  }

  getFileUrl(fileid: string): string {
    return this.messageService.getFileUrl(fileid) ?? '#';
  }

  getFileLabel(message: ChatMessage): string {
    return message.filePreviewName || (message.fileid ? `File ${message.fileid}` : 'File');
  }

  goBack(): void {
    this.router.navigate(['/chats']);
  }

  canDeleteChat(): boolean {
    return this.chat?.role === 'owner' || this.chat?.role === 'admin';
  }

  canLeaveChat(): boolean {
    return this.chat?.role === 'member';
  }

  getMemberPreview(): string {
    const names = getChatMembers(this.chat, this.messages)
      .map((member) => getProfileDisplayName(member))
      .filter(Boolean);

    if (!names.length) {
      return 'No members';
    }

    if (names.length <= 3) {
      return names.join(', ');
    }

    return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
  }

  deleteChat(): void {
    if (!this.chatid) return;

    const confirmed = confirm('Do you really want to delete this chat?');

    if (!confirmed) return;

    const request = this.chatService.deleteChat(this.chatid);

    if (!request) return;

    request.subscribe({
      next: () => {
        this.router.navigate(['/chats']);
      },
      error: (error: unknown) => {
        console.error('Delete chat error:', error);
        this.actionMessage = 'Chat could not be deleted.';
      },
    });
  }

  leaveChat(): void {
    if (!this.chatid) return;

    const confirmed = confirm('Do you really want to leave this chat?');

    if (!confirmed) return;

    const request = this.chatService.leaveChat(this.chatid);

    if (!request) return;

    request.subscribe({
      next: () => {
        this.router.navigate(['/chats']);
      },
      error: (error: unknown) => {
        console.error('Leave chat error:', error);
        this.actionMessage = 'Chat could not be left.';
      },
    });
  }

  sendMessage(): void {
    const text = this.newMessageText.trim();

    if (!text && !this.selectedPhotoBase64 && !this.selectedFileBase64) {
      return;
    }

    const pendingMessage = this.createPendingMessage(
      text || undefined,
      this.selectedPhotoBase64 || undefined,
      this.selectedFileBase64 || undefined,
      this.selectedFileName || undefined,
      undefined,
    );

    if (!this.isOnline()) {
      this.queuePendingMessage(pendingMessage);
      this.newMessageText = '';
      this.clearDraft();
      this.selectedPhotoBase64 = '';
      this.selectedFileBase64 = '';
      this.selectedFileName = '';
      this.cdr.detectChanges();
      setTimeout(() => this.scrollToBottom(), 0);
      return;
    }

    const request = this.messageService.postMessage(
      pendingMessage.text,
      this.chatid,
      pendingMessage.photo,
      pendingMessage.position,
      pendingMessage.file,
    );

    if (!request) {
      this.queuePendingMessage(pendingMessage);
      this.newMessageText = '';
      this.clearDraft();
      this.selectedPhotoBase64 = '';
      this.selectedFileBase64 = '';
      this.selectedFileName = '';
      this.cdr.detectChanges();
      setTimeout(() => this.scrollToBottom(), 0);
      return;
    }

    request.subscribe({
      next: () => {
        this.newMessageText = '';
        this.clearDraft();
        this.selectedPhotoBase64 = '';
        this.selectedFileBase64 = '';
        this.selectedFileName = '';
        this.loadMessages();
      },
      error: (error: unknown) => {
        console.error('Post message error:', error);
        this.queuePendingMessage(pendingMessage);
        this.newMessageText = '';
        this.clearDraft();
        this.selectedPhotoBase64 = '';
        this.selectedFileBase64 = '';
        this.selectedFileName = '';
        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 0);
      },
    });
  }

  removeSelectedPhoto(): void {
    this.selectedPhotoBase64 = '';
  }

  removeSelectedFile(): void {
    this.selectedFileBase64 = '';
    this.selectedFileName = '';
  }

  onDraftChange(): void {
    this.saveDraft();
  }

  getInitials(message: ApiMessage): string {
    const name = message.usernick || message.username || message.userid || '?';
    return name.charAt(0).toUpperCase();
  }

  isMyMessage(message: ChatMessage): boolean {
    if (message.pending) {
      return true;
    }

    const currentUserHash = this.authService.getCurrentUserHash();

    if (!currentUserHash || !message.userhash) {
      return false;
    }

    return message.userhash === currentUserHash;
  }

  shouldShowDateSeparator(index: number): boolean {
    if (index === 0) return true;

    const currentMessage = this.messages[index];
    const previousMessage = this.messages[index - 1];

    return (
      this.getMessageDateKey(currentMessage.time) !== this.getMessageDateKey(previousMessage.time)
    );
  }

  getDateSeparator(time: string): string {
    const date = this.parseMessageDate(time);

    if (!date) return time;

    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (this.isSameDay(date, today)) return 'Today';

    if (this.isSameDay(date, yesterday)) return 'Yesterday';

    if (date.getFullYear() === today.getFullYear()) {
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
      });
    }

    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  formatTime(time: string): string {
    const date = this.parseMessageDate(time);

    if (!date) return time;

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private getMessageDateKey(time: string): string {
    const date = this.parseMessageDate(time);

    if (!date) return time;

    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  private parseMessageDate(time: string): Date | null {
    const match = time.match(/^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})$/);

    if (match) {
      const [, datePart, hours, minutes, seconds] = match;
      const normalizedTime = `${datePart}T${hours}:${minutes}:${seconds}`;
      const date = new Date(normalizedTime);

      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(time);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  private scrollToBottom(): void {
    const container = this.messagesContainer?.nativeElement;

    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }

  private markChatAsRead(messages: ApiMessage[]): void {
    const lastMessage = messages.at(-1);

    if (!lastMessage) return;

    const savedState = localStorage.getItem(this.chatReadStateKey);
    let readState: Record<string, { lastMessageId?: string; lastMessageTime?: string }> = {};

    if (savedState) {
      try {
        readState = JSON.parse(savedState) as Record<
          string,
          { lastMessageId?: string; lastMessageTime?: string }
        >;
      } catch {
        readState = {};
      }
    }

    readState[String(this.chatid)] = {
      lastMessageId: lastMessage.id,
      lastMessageTime: lastMessage.time,
    };

    localStorage.setItem(this.chatReadStateKey, JSON.stringify(readState));
  }

  private addOnlineListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', this.handleOnline);
  }

  private removeOnlineListener(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('online', this.handleOnline);
  }

  private isOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }

  private createPendingMessage(
    text?: string,
    photo?: string,
    file?: string,
    fileName?: string,
    position?: string,
  ): PendingMessage {
    return {
      clientId: `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text,
      photo,
      file,
      fileName,
      position,
      createdAt: new Date().toISOString(),
    };
  }

  private queuePendingMessage(message: PendingMessage): void {
    const pendingMessages = this.getPendingMessages();

    if (!pendingMessages.some((pendingMessage) => pendingMessage.clientId === message.clientId)) {
      pendingMessages.push(message);
      localStorage.setItem(this.getPendingMessagesKey(), JSON.stringify(pendingMessages));
    }

    this.messages = this.withPendingMessages(this.getCachedMessages());
  }

  private flushPendingMessages(): void {
    if (!this.isOnline() || this.isFlushingPendingMessages) return;

    const [nextPendingMessage] = this.getPendingMessages();

    if (!nextPendingMessage) return;

    const request = this.messageService.postMessage(
      nextPendingMessage.text,
      this.chatid,
      nextPendingMessage.photo,
      nextPendingMessage.position,
      nextPendingMessage.file,
    );

    if (!request) return;

    this.isFlushingPendingMessages = true;

    request.subscribe({
      next: () => {
        const remainingMessages = this
          .getPendingMessages()
          .filter((message) => message.clientId !== nextPendingMessage.clientId);

        localStorage.setItem(this.getPendingMessagesKey(), JSON.stringify(remainingMessages));
        this.isFlushingPendingMessages = false;

        if (remainingMessages.length) {
          this.flushPendingMessages();
        } else {
          this.loadMessages();
        }
      },
      error: (error: unknown) => {
        console.error('Flush pending message error:', error);
        this.isFlushingPendingMessages = false;
      },
    });
  }

  private withPendingMessages(messages: ApiMessage[]): ChatMessage[] {
    return [...messages, ...this.getPendingMessages().map((message) => this.toChatMessage(message))];
  }

  private toChatMessage(message: PendingMessage): ChatMessage {
    const profile = this.authService.getUserProfile();

    return {
      id: message.clientId,
      clientId: message.clientId,
      userid: profile?.userid ?? 'me',
      usernick: profile?.nickname,
      userfullname: profile?.fullname,
      userhash: profile?.hash,
      chatid: this.chatid,
      time: message.createdAt,
      text: message.text,
      position: message.position,
      photoPreviewUrl: message.photo,
      filePreviewName: message.fileName,
      pending: true,
    };
  }

  private getPendingMessages(): PendingMessage[] {
    const savedMessages = localStorage.getItem(this.getPendingMessagesKey());

    if (!savedMessages) return [];

    try {
      return JSON.parse(savedMessages) as PendingMessage[];
    } catch {
      return [];
    }
  }

  private getCachedMessages(): ApiMessage[] {
    const cachedMessages = localStorage.getItem(this.getCachedMessagesKey());

    if (!cachedMessages) return [];

    try {
      return JSON.parse(cachedMessages) as ApiMessage[];
    } catch {
      return [];
    }
  }

  private getRetryAfter(key: string): number {
    return Number(localStorage.getItem(key) ?? 0);
  }

  private setRetryAfter(key: string, delayMs: number): void {
    localStorage.setItem(key, String(Date.now() + delayMs));
  }

  private getFailedPhotoIds(): string[] {
    const savedPhotoIds = localStorage.getItem(this.failedPhotoIdsKey);

    if (!savedPhotoIds) return [];

    try {
      return JSON.parse(savedPhotoIds) as string[];
    } catch {
      return [];
    }
  }

  private saveFailedPhotoId(photoid: string): void {
    const failedPhotoIds = this.getFailedPhotoIds();

    if (failedPhotoIds.includes(photoid)) return;

    localStorage.setItem(this.failedPhotoIdsKey, JSON.stringify([...failedPhotoIds, photoid]));
  }

  private getDraftText(): string {
    return this.getDrafts()[this.chatid] ?? '';
  }

  private saveDraft(): void {
    const drafts = this.getDrafts();
    const text = this.newMessageText;

    if (text.trim()) {
      drafts[this.chatid] = text;
    } else {
      delete drafts[this.chatid];
    }

    localStorage.setItem(this.chatDraftsKey, JSON.stringify(drafts));
  }

  private clearDraft(): void {
    const drafts = this.getDrafts();
    delete drafts[this.chatid];
    localStorage.setItem(this.chatDraftsKey, JSON.stringify(drafts));
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
}
