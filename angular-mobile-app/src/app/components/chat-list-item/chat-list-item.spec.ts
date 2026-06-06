import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatListItem } from './chat-list-item';

describe('ChatListItem', () => {
  let component: ChatListItem;
  let fixture: ComponentFixture<ChatListItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatListItem],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatListItem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
