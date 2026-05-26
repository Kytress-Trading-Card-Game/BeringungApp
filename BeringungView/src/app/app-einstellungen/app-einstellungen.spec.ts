import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppEinstellungen } from './app-einstellungen';

describe('AppEinstellungen', () => {
  let component: AppEinstellungen;
  let fixture: ComponentFixture<AppEinstellungen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppEinstellungen],
    }).compileComponents();

    fixture = TestBed.createComponent(AppEinstellungen);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
