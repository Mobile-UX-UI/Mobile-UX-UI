import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { BottomNavbar } from '../../components/bottom-navbar/bottom-navbar';
import { ChatListItem } from '../../components/chat-list-item/chat-list-item';

import { ChatService } from '../../services/chat/chat.service';
import { AuthService } from '../../services/auth/auth.service';

import { Chat } from '../../models/chat/chat';

@Component({
  selector: 'app-chat-page',
  imports: [BottomNavbar, FormsModule, MatIconModule, ChatListItem],
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.css',
})
export class ChatPage implements OnInit {
  private router = inject(Router);
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  chats: Chat[] = [];
  searchText = '';

  ngOnInit(): void {
    this.loadChats();
  }

  loadChats(): void {
    const request = this.chatService.getChats();

    if (!request) {
      return;
    }

    request.subscribe({
      next: (response) => {
        this.chats = [...(response.chats ?? [])];

        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Get chats error:', error);
      },
    });
  }

  get filteredChats(): Chat[] {
    const search = this.searchText.toLowerCase().trim();

    if (!search) {
      return this.chats;
    }

    return this.chats.filter((chat) => chat.chatname.toLowerCase().includes(search));
  }

  onCreateGroup(): void {
    this.router.navigate(['/chats/new']);
  }
}
