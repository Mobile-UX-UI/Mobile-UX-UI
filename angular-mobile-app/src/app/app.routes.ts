import { Routes } from '@angular/router';
import { WelcomePage } from './pages/welcome-page/welcome-page';
import { LoginPage } from './pages/login-page/login-page';
import { RegisterPage } from './pages/register-page/register-page';
import { GroupsPage } from './pages/groups-page/groups-page';
import { InvitationsPage } from './pages/invitations-page/invitations-page';
import { YouPage } from './pages/you-page/you-page';
//import { ChatPage } from './pages/chat-page/chat-page';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: WelcomePage },
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'groups', component: GroupsPage, canActivate: [authGuard] },
  { path: 'invitations', component: InvitationsPage, canActivate: [authGuard] },
  { path: 'you', component: YouPage, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
