import { Routes } from '@angular/router';
import { WelcomePage } from './pages/welcome-page/welcome-page';
import { LoginPage } from './pages/login-page/login-page';
import { RegisterPage } from './pages/register-page/register-page';
import { ChatListPage } from './pages/chat-list-page/chat-list-page';
import { InvitationsPage } from './pages/invitations-page/invitations-page';
import { ProfilePage } from './pages/profile-page/profile-page';
import { authGuard } from './guards/auth.guard';
import { ChatCreationPage } from './pages/chat-creation-page/chat-creation-page';
import { ChatDetailPage } from './pages/chat-detail-page/chat-detail-page';

export const routes: Routes = [
  { path: '', component: WelcomePage },
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'chats', component: ChatListPage, canActivate: [authGuard] },
  { path: 'chats/new', component: ChatCreationPage, canActivate: [authGuard] },
  { path: 'chats/:chatid', component: ChatDetailPage, canActivate: [authGuard] },
  { path: 'invitations', component: InvitationsPage, canActivate: [authGuard] },
  { path: 'profile', component: ProfilePage, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' },
];
