import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ApiMessage } from '../../models/message/api-message';
import { Chat } from '../../models/chat/chat';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService } from '../../services/chat/chat.service';
import { MessageService } from '../../services/message/message.service';
import { AuthService } from '../../services/auth/auth.service';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-chat-detail-page',
  imports: [FormsModule, MatIconModule],
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

  chatid = '';
  chat?: Chat;

  messages: ApiMessage[] = [];
  newMessageText = '';

  selectedPhotoBase64 = '';
  photoUrls: Record<string, string> = {};

  isCameraOpen = false;
  isAttachmentMenuOpen = false;

  private cameraStream?: MediaStream;

  ngOnInit(): void {
    this.chatid = this.route.snapshot.paramMap.get('chatid') ?? '';
    this.loadChat();
    this.loadMessages();
  }

  ngOnDestroy(): void {
    this.closeCamera();
  }

  loadChat(): void {
    const request = this.chatService.getChats();

    if (!request) return;

    request.subscribe({
      next: (response) => {
        this.chat = response.chats?.find((chat) => chat.chatid === this.chatid);
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        console.error('Load chat error:', error);
      },
    });
  }

  loadMessages(): void {
    const request = this.messageService.getMessages(undefined, this.chatid);

    if (!request) return;

    request.subscribe({
      next: (response) => {
        this.messages = [...(response.messages ?? [])];
        this.loadPhotos();
        this.cdr.detectChanges();

        setTimeout(() => {
          this.scrollToBottom();
        }, 0);
      },
      error: (error: unknown) => {
        console.error('Get messages error:', error);
      },
    });
  }

  loadPhotos(): void {
    for (const message of this.messages) {
      if (!message.photoid || this.photoUrls[message.photoid]) {
        continue;
      }

      const request = this.messageService.getPhoto(message.photoid);

      if (!request) {
        continue;
      }

      request.subscribe({
        next: (blob) => {
          this.photoUrls[message.photoid!] = URL.createObjectURL(blob);
          this.cdr.detectChanges();
        },
        error: (error: unknown) => {
          console.error('Get photo error:', error);
        },
      });
    }
  }

  toggleAttachmentMenu(): void {
    this.isAttachmentMenuOpen = !this.isAttachmentMenuOpen;
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

  openMap(position: string): void {
    window.open(`https://maps.google.com/?q=${position}`, '_blank');
  }

  goBack(): void {
    this.router.navigate(['/chats']);
  }

  sendMessage(): void {
    const text = this.newMessageText.trim();

    if (!text && !this.selectedPhotoBase64) {
      return;
    }

    const request = this.messageService.postMessage(
      text || undefined,
      this.chatid,
      this.selectedPhotoBase64 || undefined,
      undefined,
    );

    if (!request) return;

    request.subscribe({
      next: () => {
        this.newMessageText = '';
        this.selectedPhotoBase64 = '';
        this.loadMessages();
      },
      error: (error: unknown) => {
        console.error('Post message error:', error);
      },
    });
  }

  removeSelectedPhoto(): void {
    this.selectedPhotoBase64 = '';
  }

  getInitials(message: ApiMessage): string {
    const name = message.usernick || message.username || message.userid || '?';
    return name.charAt(0).toUpperCase();
  }

  isMyMessage(message: ApiMessage): boolean {
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
}
