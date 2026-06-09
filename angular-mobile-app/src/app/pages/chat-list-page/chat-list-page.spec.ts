import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatListPage } from './chat-list-page';

describe('ChatListPage', () => {
  let component: ChatListPage;
  let fixture: ComponentFixture<ChatListPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatListPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatListPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
