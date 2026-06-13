import { PLATFORM_ID} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';

import { BottomNavbar } from '../../components/bottom-navbar/bottom-navbar';
import { InvitationService } from '../../services/invitation/invitation.service';
import { Invitation } from '../../models/invitations/invitation';



type InvitationTab = 'received' | 'sent';

@Component({
  selector: 'app-invitations-page',
  imports: [CommonModule, BottomNavbar],
  templateUrl: './invitations-page.html',
  styleUrl: './invitations-page.css',
})
export class InvitationsPage implements OnInit {
  private invitationService = inject(InvitationService);

  selectedTab: InvitationTab = 'received';

  private platformId = inject(PLATFORM_ID);

  invitations: Invitation[] = [];
  visibleInvitations: Invitation[] = [];

  hiddenInvitationIds: string[] = [];
  errorMessage = '';

  ngOnInit(): void {
    this.hiddenInvitationIds = this.loadHiddenInvitationIds();
    this.loadInvitations();
  }

  selectTab(tab: InvitationTab): void {
    this.selectedTab = tab;
  }

  loadInvitations(): void {
    this.errorMessage = '';

    const request = this.invitationService.getInvites();

    if (!request) {
      this.errorMessage = 'You are not logged in.';
      return;
    }

    request.subscribe({
      next: (response) => {
        this.invitations = response.invites ?? [];
        this.updateVisibleInvitations();
      },
      error: (error) => {
        console.error('Get invitations error:', error);
        this.errorMessage = 'Invitations could not be loaded.';
      },
    });
  }

  acceptInvitation(chatid: string): void {
    const request = this.invitationService.acceptInvite(String(chatid));

    if (!request) return;

    request.subscribe({
      next: () => {
        this.hideInvitation(chatid);
        this.errorMessage = '';
      },
      error: (error) => {
        console.error('Accept invitation error:', error);
        this.errorMessage = 'Invitation could not be accepted.';
      },
    });
  }

  declineInvitation(chatid: string): void {
    this.hideInvitation(chatid);
    this.errorMessage = '';
  }

  private hideInvitation(chatid: string): void {
    const id = String(chatid);

    if (!this.hiddenInvitationIds.includes(id)) {
      this.hiddenInvitationIds = [...this.hiddenInvitationIds, id];
    }

    if (isPlatformBrowser(this.platformId)) {
  sessionStorage.setItem(
    'hidden_invitation_ids',
    JSON.stringify(this.hiddenInvitationIds),
  );
}

    this.updateVisibleInvitations();
  }

  private updateVisibleInvitations(): void {
    this.visibleInvitations = this.invitations.filter(
      (invitation) => !this.hiddenInvitationIds.includes(String(invitation.chatid)),
    );
  }

  private loadHiddenInvitationIds(): string[] {
  if (!isPlatformBrowser(this.platformId)) {
    return [];
  }

  const saved = sessionStorage.getItem('hidden_invitation_ids');

  if (!saved) return [];

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}
}