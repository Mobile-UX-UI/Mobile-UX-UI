import { Routes } from '@angular/router';
import { WelcomePage } from './pages/welcome-page/welcome-page';
import { LoginPage } from './pages/login-page/login-page';
import { RegisterPage } from './pages/register-page/register-page';
import { ChatPage } from './pages/chat-page/chat-page';
import { UnreadChatsPage } from './pages/unread-chats-page/unread-chats-page';
import { FavoriteChatsPage } from './pages/favorite-chats-page/favorite-chats-page';
import { InvitationsPage } from './pages/invitations-page/invitations-page';
import { SentInvitationsPage } from './pages/sent-invitations-page/sent-invitations-page';
import { ProfilePage } from './pages/profile-page/profile-page';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: WelcomePage },
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'chats', component: ChatPage, canActivate: [authGuard] },
  { path: 'unread-chats', component: UnreadChatsPage, canActivate: [authGuard] },
  { path: 'unread-chats', component: UnreadChatsPage, canActivate: [authGuard] },
  { path: 'favorite-chats', component: FavoriteChatsPage, canActivate: [authGuard] },
  { path: 'invitations', component: InvitationsPage, canActivate: [authGuard] },
  { path: 'sent-invitations', component: SentInvitationsPage, canActivate: [authGuard] },
  { path: 'profile', component: ProfilePage, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
