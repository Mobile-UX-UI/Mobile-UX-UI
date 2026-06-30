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
  private readonly legacyFailedPhotoIdsKey = 'failed_photo_ids';
  private readonly pinnedMessagesKey = 'pinned_messages';
  private readonly longPressDurationMs = 400;
  private readonly maxGalleryPhotoDimension = 800;
  private readonly apiRetryDelayMs = 60000;
  private readonly messagePollingIntervalMs = 5000;
  private readonly messagePollingBackoffMs = 15000;
  private readonly handleOnline = () => this.flushPendingMessages();
  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.pollForNewMessages();
    }
  };
  private isFlushingPendingMessages = false;
  private isMessageRequestInFlight = false;
  private nextMessagePollAt = 0;
  private messagePollingTimer?: number;
  private unavailablePhotoIds = new Set<string>();
  private longPressTimer?: ReturnType<typeof setTimeout>;
  private longPressPointerId?: number;
  private longPressStartX = 0;
  private longPressStartY = 0;

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
  cameraFacingMode: 'user' | 'environment' = 'environment';
  isSwitchingCamera = false;

  isChatMenuOpen = false;
  isMembersListOpen = false;
  isPinnedMessagesOpen = false;
  pinnedMessageIds: string[] = [];
  highlightedMessageId = '';
  actionMessage = '';

  private cameraStream?: MediaStream;

  ngOnInit(): void {
    this.chatid = this.route.snapshot.paramMap.get('chatid') ?? '';
    localStorage.removeItem(this.legacyFailedPhotoIdsKey);
    this.pinnedMessageIds = this.getSavedPinnedMessageIds();
    this.newMessageText = this.getDraftText();
    this.loadChat();
    this.loadMessages();
    this.addOnlineListener();
    this.startRealtimeUpdates();
    this.flushPendingMessages();
  }

  ngOnDestroy(): void {
    this.saveDraft();
    this.closeCamera();
    this.removeOnlineListener();
    this.stopRealtimeUpdates();
    this.cancelMessageLongPress();

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
    if (this.isMessageRequestInFlight) return;

    const request = this.messageService.getMessages(undefined, this.chatid);

    if (!request) {
      this.loadCachedMessages();
      return;
    }

    this.isMessageRequestInFlight = true;

    request.subscribe({
      next: (response) => {
        this.nextMessagePollAt = 0;
        this.messages = this.withPendingMessages([...(response.messages ?? [])]);

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
        this.isMessageRequestInFlight = false;
        this.nextMessagePollAt = Date.now() + this.messagePollingBackoffMs;
        console.error('Get messages error:', error);
        this.loadCachedMessages();
      },
      complete: () => {
        this.isMessageRequestInFlight = false;
      },
    });
  }

  private pollForNewMessages(): void {
    if (
      this.isMessageRequestInFlight ||
      Date.now() < this.nextMessagePollAt ||
      !this.isOnline() ||
      (typeof document !== 'undefined' && document.visibilityState === 'hidden')
    ) {
      return;
    }

    const currentMessages = this.messages.filter((message) => !message.pending);
    const lastMessageId = currentMessages.at(-1)?.id;

    const request = this.messageService.getMessages(lastMessageId, this.chatid, undefined, true);

    if (!request) return;

    this.isMessageRequestInFlight = true;

    request.subscribe({
      next: (response) => {
        this.nextMessagePollAt = 0;
        const incomingMessages = response.messages ?? [];
        const knownIds = new Set(currentMessages.map((message) => String(message.id)));
        const newMessages = incomingMessages.filter(
          (message) => !knownIds.has(String(message.id)),
        );

        if (!newMessages.length) return;

        const mergedMessages = [...currentMessages, ...newMessages];
        this.messages = this.withPendingMessages(mergedMessages);
        localStorage.setItem(this.getCachedMessagesKey(), JSON.stringify(mergedMessages));
        this.markChatAsRead(mergedMessages);
        this.loadPhotos();
        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 0);
      },
      error: (error: unknown) => {
        this.isMessageRequestInFlight = false;
        this.nextMessagePollAt = Date.now() + this.messagePollingBackoffMs;
        console.error('Live message update error:', error);
      },
      complete: () => {
        this.isMessageRequestInFlight = false;
      },
    });
  }

  private startRealtimeUpdates(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this.messagePollingTimer = window.setInterval(
      () => this.pollForNewMessages(),
      this.messagePollingIntervalMs,
    );
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private stopRealtimeUpdates(): void {
    if (this.messagePollingTimer !== undefined) {
      clearInterval(this.messagePollingTimer);
      this.messagePollingTimer = undefined;
    }

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
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
    for (const message of this.messages) {
      if (
        !message.photoid ||
        this.photoUrls[message.photoid] ||
        this.unavailablePhotoIds.has(message.photoid)
      ) {
        continue;
      }

      const photoUrl = this.messageService.getPhotoUrl(message.photoid);

      if (photoUrl) {
        this.photoUrls[message.photoid] = photoUrl;
      }
    }
  }

  isPhotoUnavailable(photoid: string): boolean {
    return this.unavailablePhotoIds.has(photoid);
  }

  markPhotoUnavailable(photoid: string): void {
    this.unavailablePhotoIds.add(photoid);
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
      const image = new Image();

      image.onload = () => {
        const scale = Math.min(
          1,
          this.maxGalleryPhotoDimension / Math.max(image.naturalWidth, image.naturalHeight),
        );
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

        const context = canvas.getContext('2d');

        if (!context) {
          this.actionMessage = 'The photo could not be prepared.';
          this.cdr.detectChanges();
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        this.selectedPhotoBase64 = canvas.toDataURL('image/png');
        this.isAttachmentMenuOpen = false;
        this.actionMessage = '';
        this.cdr.detectChanges();
      };

      image.onerror = () => {
        this.selectedPhotoBase64 = '';
        this.isAttachmentMenuOpen = false;
        this.actionMessage = 'This photo format is not supported.';
        this.cdr.detectChanges();
      };

      image.src = reader.result as string;
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
      this.cameraFacingMode = 'environment';
      await this.startCameraStream();
    } catch (error: unknown) {
      console.error('Camera access error:', error);
    }
  }

  async switchCamera(): Promise<void> {
    if (this.isSwitchingCamera) return;

    const previousFacingMode = this.cameraFacingMode;
    this.cameraFacingMode = previousFacingMode === 'environment' ? 'user' : 'environment';
    this.isSwitchingCamera = true;

    try {
      await this.startCameraStream();
    } catch (error: unknown) {
      console.error('Camera switch error:', error);
      this.cameraFacingMode = previousFacingMode;

      try {
        await this.startCameraStream();
      } catch (restoreError: unknown) {
        console.error('Camera restore error:', restoreError);
        this.closeCamera();
      }
    } finally {
      this.isSwitchingCamera = false;
      this.cdr.detectChanges();
    }
  }

  private async startCameraStream(): Promise<void> {
    this.cameraStream?.getTracks().forEach((track) => track.stop());

    this.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: this.cameraFacingMode,
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

  get pinnedMessages(): ChatMessage[] {
    const messagesById = new Map(
      this.messages.map((message) => [String(message.id), message]),
    );

    return this.pinnedMessageIds
      .map((id) => messagesById.get(id))
      .filter((message): message is ChatMessage => !!message);
  }

  isMessagePinned(message: ChatMessage): boolean {
    return this.pinnedMessageIds.includes(String(message.id));
  }

  startMessageLongPress(event: PointerEvent, message: ChatMessage): void {
    if (message.pending || event.button !== 0) return;

    this.cancelMessageLongPress();
    this.longPressPointerId = event.pointerId;
    this.longPressStartX = event.clientX;
    this.longPressStartY = event.clientY;
    this.longPressTimer = setTimeout(() => {
      this.togglePinnedMessage(message);
      this.longPressTimer = undefined;

      if ('vibrate' in navigator) {
        navigator.vibrate(35);
      }
    }, this.longPressDurationMs);
  }

  moveMessageLongPress(event: PointerEvent): void {
    if (event.pointerId !== this.longPressPointerId) return;

    const movedX = Math.abs(event.clientX - this.longPressStartX);
    const movedY = Math.abs(event.clientY - this.longPressStartY);

    if (movedX > 10 || movedY > 10) {
      this.cancelMessageLongPress();
    }
  }

  cancelMessageLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }

    this.longPressTimer = undefined;
    this.longPressPointerId = undefined;
  }

  preventMessageContextMenu(event: Event): void {
    event.preventDefault();
  }

  togglePinnedMessage(message: ChatMessage): void {
    if (message.pending) return;

    const messageId = String(message.id);

    if (this.isMessagePinned(message)) {
      this.pinnedMessageIds = this.pinnedMessageIds.filter((id) => id !== messageId);
    } else {
      this.pinnedMessageIds = [...this.pinnedMessageIds, messageId];
    }

    this.savePinnedMessageIds();

    if (!this.pinnedMessageIds.length) {
      this.isPinnedMessagesOpen = false;
    }
  }

  togglePinnedMessages(): void {
    this.isPinnedMessagesOpen = !this.isPinnedMessagesOpen;
  }

  getPinnedMessagePreview(message: ChatMessage): string {
    if (message.text?.trim()) return message.text.trim();
    if (message.photoid || message.photoPreviewUrl) return 'Photo';
    if (message.fileid || message.filePreviewName) return 'File';
    if (message.position) return 'Location';

    return 'Message';
  }

  scrollToMessage(messageId: string): void {
    this.isPinnedMessagesOpen = false;

    requestAnimationFrame(() => {
      const element = document.getElementById(this.getMessageElementId(messageId));

      if (!element) return;

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.highlightedMessageId = String(messageId);
      setTimeout(() => {
        if (this.highlightedMessageId === String(messageId)) {
          this.highlightedMessageId = '';
        }
      }, 1600);
    });
  }

  getMessageElementId(messageId: string): string {
    return `chat-message-${String(messageId).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
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

    const savedState = localStorage.getItem(this.getChatReadStateKey());
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

    localStorage.setItem(this.getChatReadStateKey(), JSON.stringify(readState));
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

  private getSavedPinnedMessageIds(): string[] {
    const savedIds = localStorage.getItem(this.getPinnedMessagesStorageKey());

    if (!savedIds) return [];

    try {
      const parsedIds = JSON.parse(savedIds);

      return Array.isArray(parsedIds) ? parsedIds.map(String) : [];
    } catch {
      return [];
    }
  }

  private savePinnedMessageIds(): void {
    localStorage.setItem(
      this.getPinnedMessagesStorageKey(),
      JSON.stringify(this.pinnedMessageIds),
    );
  }

  private getPinnedMessagesStorageKey(): string {
    const currentUserHash = this.authService.getCurrentUserHash() ?? 'anonymous';

    return `${this.pinnedMessagesKey}_${currentUserHash}_${this.chatid}`;
  }

  private getRetryAfter(key: string): number {
    return Number(localStorage.getItem(key) ?? 0);
  }

  private setRetryAfter(key: string, delayMs: number): void {
    localStorage.setItem(key, String(Date.now() + delayMs));
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

  private getChatReadStateKey(): string {
    const currentUserHash = this.authService.getCurrentUserHash();

    return currentUserHash
      ? `${this.chatReadStateKey}_${currentUserHash}`
      : this.chatReadStateKey;
  }
}
