import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { Chat } from '../../models/chat/chat';
import { ApiMessage } from '../../models/message/api-message';
import { ApiProfile } from '../../models/profile/api-profile';
import {
  getChatMembers,
  getMemberRole,
  getProfileDisplayName,
  getProfileInitial,
} from '../../utils/profile.utils';

@Component({
  selector: 'app-members-dialog',
  imports: [MatIconModule],
  templateUrl: './members-dialog.html',
  styleUrl: './members-dialog.css',
})
export class MembersDialog {
  chat = input.required<Chat>();
  messages = input<ApiMessage[]>([]);
  closed = output<void>();

  selectedMemberProfile?: ApiProfile;

  close(): void {
    this.selectedMemberProfile = undefined;
    this.closed.emit();
  }

  openMemberProfile(profile: ApiProfile): void {
    this.selectedMemberProfile = profile;
  }

  closeMemberProfile(): void {
    this.selectedMemberProfile = undefined;
  }

  getMembers(): ApiProfile[] {
    return getChatMembers(this.chat(), this.messages());
  }

  getProfileDisplayName(profile: ApiProfile): string {
    return getProfileDisplayName(profile);
  }

  getProfileInitial(profile: ApiProfile): string {
    return getProfileInitial(profile);
  }

  getMemberRole(profile: ApiProfile): string {
    return getMemberRole(profile, this.chat());
  }
}
