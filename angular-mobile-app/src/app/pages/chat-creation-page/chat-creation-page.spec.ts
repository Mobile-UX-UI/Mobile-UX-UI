import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatCreationPage } from './chat-creation-page';

describe('ChatCreationPage', () => {
  let component: ChatCreationPage;
  let fixture: ComponentFixture<ChatCreationPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatCreationPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatCreationPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
