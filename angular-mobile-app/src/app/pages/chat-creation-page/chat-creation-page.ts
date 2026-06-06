import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';

import { ProfileService } from '../../services/profile/profile.service';
import { ApiProfile } from '../../models/profile/api-profile';

@Component({
  selector: 'app-chat-creation-page',
  imports: [FormsModule, MatIcon],
  templateUrl: './chat-creation-page.html',
  styleUrl: './chat-creation-page.css',
})
export class ChatCreationPage implements OnInit {
  private profileService = inject(ProfileService);

  profiles: ApiProfile[] = [];
  selectedHashes: string[] = [];
  searchText = '';

  avatarColors = ['#B429F9', '#9C43F8', '#855DF7', '#6D77F6', '#5591F5', '#3EABF4', '#26C5F3'];

  ngOnInit(): void {
    this.loadProfiles();
  }

  loadProfiles(): void {
    const request = this.profileService.getProfiles();

    if (!request) return;

    request.subscribe({
      next: (response) => {
        this.profiles = response.profiles ?? [];
      },
      error: (error) => console.error('Get profiles error:', error),
    });
  }

  get filteredProfiles(): ApiProfile[] {
    return this.profiles.filter((profile) =>
      profile.nickname.toLowerCase().includes(this.searchText.toLowerCase().trim()),
    );
  }

  toggleProfile(profile: ApiProfile): void {
    if (this.selectedHashes.includes(profile.hash)) {
      this.selectedHashes = this.selectedHashes.filter((hash) => hash !== profile.hash);
    } else {
      this.selectedHashes.push(profile.hash);
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
    console.log('Selected users:', this.selectedHashes);
  }
}
