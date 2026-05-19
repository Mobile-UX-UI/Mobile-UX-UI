import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SentInvitationsPage } from './sent-invitations-page';

describe('SentInvitationsPage', () => {
  let component: SentInvitationsPage;
  let fixture: ComponentFixture<SentInvitationsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SentInvitationsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(SentInvitationsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
