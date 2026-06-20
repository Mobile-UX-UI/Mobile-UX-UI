import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';

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
  private platformId = inject(PLATFORM_ID);

  private readonly cachedInvitesKey = 'cached_invites';
  private readonly apiWarningUntilKey = 'api_warning_until';
  private readonly apiWarningDelayMs = 90000;

  selectedTab: InvitationTab = 'received';

  invitations: Invitation[] = [];
  visibleInvitations: Invitation[] = [];

  errorMessage = '';
  isOfflineMode = false;
  connectionMessage = '';

  ngOnInit(): void {
    this.loadInvitations();
  }

  selectTab(tab: InvitationTab): void {
    this.selectedTab = tab;
  }

  loadInvitations(): void {
    this.errorMessage = '';

    const request = this.invitationService.getInvites();

    if (!request) {
      this.loadCachedInvitations();
      return;
    }

    request.subscribe({
      next: (response) => {
        this.invitations = response.invites ?? [];
        this.isOfflineMode = false;
        this.connectionMessage = '';
        localStorage.removeItem(this.apiWarningUntilKey);

        this.saveCachedInvitations();

        this.updateVisibleInvitations();
      },
      error: (error) => {
        console.error('Get invitations error:', error);
        this.setApiWarning();
        this.loadCachedInvitations();
      },
    });
  }

  acceptInvitation(chatid: string): void {
    const request = this.invitationService.acceptInvite(String(chatid));

    if (!request) return;

    request.subscribe({
      next: () => {
        this.removeInvitation(chatid);
        this.errorMessage = '';
        this.loadInvitations();
      },
      error: (error) => {
        console.error('Accept invitation error:', error);
        this.setApiWarning();
        this.errorMessage = 'Invitation could not be accepted.';
      },
    });
  }

  declineInvitation(chatid: string): void {
    const request = this.invitationService.declineInvite(String(chatid));

    if (!request) {
      this.errorMessage = 'Invitation could not be declined.';
      return;
    }

    request.subscribe({
      next: () => {
        this.removeInvitation(chatid);
        this.errorMessage = '';
        this.loadInvitations();
      },
      error: (error) => {
        console.error('Decline invitation error:', error);
        this.setApiWarning();
        this.errorMessage = 'Invitation could not be declined.';
      },
    });
  }

  private removeInvitation(chatid: string): void {
    const id = String(chatid);

    this.invitations = this.invitations.filter(
      (invitation) => String(invitation.chatid) !== id,
    );
    this.saveCachedInvitations();
    this.updateVisibleInvitations();
  }

  private updateVisibleInvitations(): void {
    this.visibleInvitations = this.invitations;
  }

  private saveCachedInvitations(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    localStorage.setItem(this.cachedInvitesKey, JSON.stringify(this.invitations));
  }

  private loadCachedInvitations(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.invitations = [];
      this.visibleInvitations = [];
      this.isOfflineMode = true;
      this.connectionMessage = this.getConnectionFallbackMessage();
      this.errorMessage = 'Invitations could not be loaded.';
      return;
    }

    const cached = localStorage.getItem(this.cachedInvitesKey);

    if (!cached) {
      this.invitations = [];
      this.visibleInvitations = [];
      this.isOfflineMode = true;
      this.connectionMessage = this.getConnectionFallbackMessage();
      this.errorMessage = 'No cached invitations available.';
      return;
    }

    try {
      this.invitations = JSON.parse(cached) as Invitation[];
      this.isOfflineMode = true;
      this.connectionMessage = this.getConnectionFallbackMessage();
      this.errorMessage = '';
      this.updateVisibleInvitations();
    } catch {
      this.invitations = [];
      this.visibleInvitations = [];
      this.isOfflineMode = true;
      this.connectionMessage = this.getConnectionFallbackMessage();
      this.errorMessage = 'Cached invitations could not be read.';
    }
  }

  private getConnectionFallbackMessage(): string {
    if (isPlatformBrowser(this.platformId) && !navigator.onLine) {
      return 'Offline';
    }

    return 'Server/API nicht erreichbar';
  }

  private setApiWarning(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    localStorage.setItem(this.apiWarningUntilKey, String(Date.now() + this.apiWarningDelayMs));
  }

}
