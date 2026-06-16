import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { BottomNavbar } from '../../components/bottom-navbar/bottom-navbar';
import { ChatListItem } from '../../components/chat-list-item/chat-list-item';

import { ChatService } from '../../services/chat/chat.service';

import { Chat } from '../../models/chat/chat';

@Component({
  selector: 'app-chat-list-page',
  imports: [BottomNavbar, FormsModule, MatIconModule, ChatListItem],
  templateUrl: './chat-list-page.html',
  styleUrl: './chat-list-page.css',
})
export class ChatListPage implements OnInit {
  private router = inject(Router);
  private chatService = inject(ChatService);
  private cdr = inject(ChangeDetectorRef);

  private readonly cachedChatsKey = 'cached_chats';
  private readonly chatDraftsKey = 'chat_drafts';

  chats: Chat[] = [];
  searchText = '';

  isOfflineMode = false;

  ngOnInit(): void {
    this.loadChats();
  }

  loadChats(): void {
    const request = this.chatService.getChats();

    if (!request) {
      this.loadCachedChats();
      return;
    }

    request.subscribe({
      next: (response) => {
        this.chats = [...(response.chats ?? [])];
        this.isOfflineMode = false;

        localStorage.setItem(this.cachedChatsKey, JSON.stringify(this.chats));

        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Get chats error:', error);
        this.loadCachedChats();
      },
    });
  }

  loadCachedChats(): void {
    const cachedChats = localStorage.getItem(this.cachedChatsKey);

    if (!cachedChats) {
      this.chats = [];
      this.isOfflineMode = true;
      return;
    }

    try {
      this.chats = JSON.parse(cachedChats) as Chat[];
      this.isOfflineMode = true;
    } catch {
      this.chats = [];
      this.isOfflineMode = true;
    }

    this.cdr.markForCheck();
    this.cdr.detectChanges();
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

  openChat(chat: Chat): void {
    if (!chat.joined) {
      return;
    }

    this.router.navigate(['/chats', chat.chatid]);
  }

  getDraftText(chatid: string): string {
    const drafts = this.getDrafts();
    return drafts[String(chatid)] ?? '';
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
