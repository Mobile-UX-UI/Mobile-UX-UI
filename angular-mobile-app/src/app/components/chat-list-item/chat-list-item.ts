import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { Chat } from '../../models/chat/chat';

@Component({
  selector: 'app-chat-list-item',
  imports: [MatIconModule],
  templateUrl: './chat-list-item.html',
  styleUrl: './chat-list-item.css',
})
export class ChatListItem {
  chat = input.required<Chat>();

  avatarColors = ['#B429F9', '#9C43F8', '#855DF7', '#6D77F6', '#5591F5', '#3EABF4', '#26C5F3'];

  get firstLetter(): string {
    return this.chat().chatname.charAt(0).toUpperCase();
  }

  get avatarColor(): string {
    let sum = 0;

    for (let i = 0; i < this.chat().chatname.length; i++) {
      sum += this.chat().chatname.charCodeAt(i);
    }

    return this.avatarColors[sum % this.avatarColors.length];
  }
}
