import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BottomNavbar } from '../../components/bottom-navbar/bottom-navbar';

@Component({
  selector: 'app-sent-invitations-page',
  imports: [
    BottomNavbar,
    RouterLink
  ],
  templateUrl: './sent-invitations-page.html',
  styleUrl: './sent-invitations-page.css',
})
export class SentInvitationsPage {}