import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatDetailPage } from './chat-detail-page';

describe('ChatDetailPage', () => {
  let component: ChatDetailPage;
  let fixture: ComponentFixture<ChatDetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatDetailPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatDetailPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
