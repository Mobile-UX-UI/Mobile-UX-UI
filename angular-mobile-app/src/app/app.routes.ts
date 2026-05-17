import { Routes } from '@angular/router';
import { WelcomePage } from './pages/welcome-page/welcome-page';
import { LoginPage } from './pages/login-page/login-page';
import { RegisterPage } from './pages/register-page/register-page';
import { ChatPage } from './pages/chat-page/chat-page';
import { InvitationsPage } from './pages/invitations-page/invitations-page';
import { ProfilePage } from './pages/profile-page/profile-page';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: WelcomePage },
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'chats', component: ChatPage, canActivate: [authGuard] },
  { path: 'invitations', component: InvitationsPage, canActivate: [authGuard] },
  { path: 'profile', component: ProfilePage, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
