import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-bottom-navbar',
  imports: [
    RouterLink,
    MatIconModule
  ],
  templateUrl: './bottom-navbar.html',
  styleUrl: './bottom-navbar.css',
})
export class BottomNavbar {
  router = inject(Router);

  isInvitationsActive(): boolean {
    return (
      this.router.url === '/invitations' ||
      this.router.url === '/sent-invitations'
    );
  }

  isChatsActive(): boolean {
    return this.router.url === '/chats';
  }

  isProfileActive(): boolean {
    return this.router.url === '/profile';
  }
}