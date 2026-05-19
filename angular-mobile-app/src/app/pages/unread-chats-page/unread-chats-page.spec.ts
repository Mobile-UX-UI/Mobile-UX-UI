import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnreadChatsPage } from './unread-chats-page';

describe('UnreadChatsPage', () => {
  let component: UnreadChatsPage;
  let fixture: ComponentFixture<UnreadChatsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnreadChatsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(UnreadChatsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
