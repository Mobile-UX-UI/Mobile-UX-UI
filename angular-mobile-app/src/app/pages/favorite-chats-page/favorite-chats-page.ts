import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';

import { BottomNavbar } from '../../components/bottom-navbar/bottom-navbar';

@Component({
  selector: 'app-favorite-chats-page',
  imports: [
    BottomNavbar,
    FormsModule,
    RouterLink,
    MatIconModule
  ],
  templateUrl: './favorite-chats-page.html',
  styleUrl: './favorite-chats-page.css',
})
export class FavoriteChatsPage {
  searchText = '';

  onSearch(): void {}

  onCreateGroup(): void {}
}