import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FavoriteChatsPage } from './favorite-chats-page';

describe('FavoriteChatsPage', () => {
  let component: FavoriteChatsPage;
  let fixture: ComponentFixture<FavoriteChatsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FavoriteChatsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(FavoriteChatsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
