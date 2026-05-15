import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvitationsPage } from './invitations-page';

describe('InvitationsPage', () => {
  let component: InvitationsPage;
  let fixture: ComponentFixture<InvitationsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvitationsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(InvitationsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
