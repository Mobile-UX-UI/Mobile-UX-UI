import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

import { ChatService } from '../../services/chat/chat.service';
import { InvitationService } from '../../services/invitation/invitation.service';
import { ProfileService } from '../../services/profile/profile.service';

import { ApiProfile } from '../../models/profile/api-profile';

@Component({
  selector: 'app-chat-creation-page',
  imports: [FormsModule, MatIcon],
  templateUrl: './chat-creation-page.html',
  styleUrl: './chat-creation-page.css',
})
export class ChatCreationPage implements OnInit {
  private chatService = inject(ChatService);
  private invitationService = inject(InvitationService);
  private profileService = inject(ProfileService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  profiles: ApiProfile[] = [];
  selectedHashes: string[] = [];

  chatname = '';
  ispublic = false;
  searchText = '';

  avatarColors = ['#B429F9', '#9C43F8', '#855DF7', '#6D77F6', '#5591F5', '#3EABF4', '#26C5F3'];

  ngOnInit(): void {
    setTimeout(() => {
      this.loadProfiles();
    }, 0);
  }

  goBack(): void {
    this.router.navigateByUrl('/chats');
  }

  loadProfiles(): void {
    const request = this.profileService.getProfiles();

    if (!request) {
      return;
    }

    request.subscribe({
      next: (response) => {
        this.profiles = [...(response.profiles ?? [])];

        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Get profiles error:', error);
      },
    });
  }

  get filteredProfiles(): ApiProfile[] {
    const search = this.searchText.toLowerCase().trim();

    if (!search) {
      return this.profiles;
    }

    return this.profiles.filter((profile) => profile.nickname?.toLowerCase().includes(search));
  }

  toggleProfile(profile: ApiProfile): void {
    if (this.selectedHashes.includes(profile.hash)) {
      this.selectedHashes = this.selectedHashes.filter((hash) => hash !== profile.hash);
    } else {
      this.selectedHashes = [...this.selectedHashes, profile.hash];
    }
  }

  isSelected(profile: ApiProfile): boolean {
    return this.selectedHashes.includes(profile.hash);
  }

  getAvatarColor(hash: string): string {
    let sum = 0;

    for (let i = 0; i < hash.length; i++) {
      sum += hash.charCodeAt(i);
    }

    return this.avatarColors[sum % this.avatarColors.length];
  }

  onCreate(): void {
    const name = this.chatname.trim();

    if (!name) return;

    const request = this.chatService.createChat(name, this.ispublic);

    if (!request) return;

    request.subscribe({
      next: (response) => {
        console.log('create chat response:', response);

        const chatid = response.chatid;

        if (!chatid) return;

        this.selectedHashes.forEach((hash) => {
          this.invitationService.sendInvite(chatid, hash)?.subscribe();
        });

        this.chatname = '';
        this.ispublic = false;
        this.searchText = '';
        this.selectedHashes = [];

        this.cdr.detectChanges();

        this.router.navigateByUrl('/chats');
      },
      error: (error) => {
        console.error('Create chat error:', error);
      },
    });
  }
}
