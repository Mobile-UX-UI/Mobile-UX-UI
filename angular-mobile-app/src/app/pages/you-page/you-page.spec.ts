import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YouPage } from './you-page';

describe('YouPage', () => {
  let component: YouPage;
  let fixture: ComponentFixture<YouPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YouPage],
    }).compileComponents();

    fixture = TestBed.createComponent(YouPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
