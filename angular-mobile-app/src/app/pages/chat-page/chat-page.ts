import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';

import { BottomNavbar } from '../../components/bottom-navbar/bottom-navbar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chat-page',
  imports: [BottomNavbar, FormsModule, MatIconModule],
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.css',
})
export class ChatPage {
  private router = inject(Router);

  onCreateGroup(): void {
    this.router.navigate(['chats/new']);
  }
}
