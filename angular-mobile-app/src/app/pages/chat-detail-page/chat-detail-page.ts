import { ChangeDetectorRef, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { ApiMessage } from '../../models/message/api-message';
import { Chat } from '../../models/chat/chat';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService } from '../../services/chat/chat.service';
import { MessageService } from '../../services/message/message.service';
import { AuthService } from '../../services/auth/auth.service';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-chat-detail-page',
  imports: [FormsModule, MatIconModule],
  templateUrl: './chat-detail-page.html',
  styleUrl: './chat-detail-page.css',
})
export class ChatDetailPage implements OnInit {
  @ViewChild('messagesContainer')
  messagesContainer?: ElementRef<HTMLDivElement>;

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

  ngOnInit(): void {
    this.chatid = this.route.snapshot.paramMap.get('chatid') ?? '';

    this.loadChat();
    this.loadMessages();
  }

  loadChat(): void {
    const request = this.chatService.getChats();

    if (!request) {
      return;
    }

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

    if (!request) {
      return;
    }

    request.subscribe({
      next: (response) => {
        this.messages = [...(response.messages ?? [])];
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

  goBack(): void {
    this.router.navigate(['/chats']);
  }

  sendMessage(): void {
    const text = this.newMessageText.trim();

    if (!text) {
      return;
    }

    const request = this.messageService.postMessage(text, this.chatid);

    if (!request) {
      return;
    }

    request.subscribe({
      next: () => {
        this.newMessageText = '';
        this.loadMessages();
      },
      error: (error: unknown) => {
        console.error('Post message error:', error);
      },
    });
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

  formatTime(time: string): string {
    const date = new Date(time);

    if (Number.isNaN(date.getTime())) {
      return time;
    }

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private scrollToBottom(): void {
    const container = this.messagesContainer?.nativeElement;

    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }
}
