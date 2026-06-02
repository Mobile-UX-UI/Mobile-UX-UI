import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { BottomNavbar } from '../../components/bottom-navbar/bottom-navbar';

type InvitationTab = 'received' | 'sent';

@Component({
  selector: 'app-invitations-page',
  imports: [CommonModule, BottomNavbar],
  templateUrl: './invitations-page.html',
  styleUrl: './invitations-page.css',
})
export class InvitationsPage {
  public selectedTab: InvitationTab = 'received';

  public receivedInvitations: ReceivedInvitationView[] = [
    {
      sentOn: '04.05.2026, 20:15',
      from: 'Max Müller',
      chatname: 'Main Chat',
    },
    {
      sentOn: '05.05.2026, 17:40',
      from: 'Emma Schneider',
      chatname: 'Project Group',
    },
    {
      sentOn: '06.05.2026, 11:25',
      from: 'Dominik Becker',
      chatname: 'Gaming Chat',
    },
  ];

  public sentInvitations: SentInvitationView[] = [
    {
      sentOn: '04.05.2026, 20:15',
      to: 'Emma Schneider',
      chatname: 'Main Chat',
      status: 'accepted',
    },
    {
      sentOn: '05.05.2026, 18:40',
      to: 'Dominik Becker',
      chatname: 'Project Group',
      status: 'pending',
    },
    {
      sentOn: '06.05.2026, 12:10',
      to: 'Max Müller',
      chatname: 'Gaming Chat',
      status: 'declined',
    },
  ];

  public selectTab(tab: InvitationTab): void {
    this.selectedTab = tab;
  }
}
