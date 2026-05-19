import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';

import { BottomNavbar } from '../../components/bottom-navbar/bottom-navbar';

@Component({
  selector: 'app-unread-chats-page',
  imports: [
    BottomNavbar,
    FormsModule,
    RouterLink,
    MatIconModule
  ],
  templateUrl: './unread-chats-page.html',
  styleUrl: './unread-chats-page.css',
})
export class UnreadChatsPage {
  searchText = '';

  onSearch(): void {}

  onCreateGroup(): void {}
}