import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArtenVerwalten } from './arten-verwalten';

describe('ArtenVerwalten', () => {
  let component: ArtenVerwalten;
  let fixture: ComponentFixture<ArtenVerwalten>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArtenVerwalten],
    }).compileComponents();

    fixture = TestBed.createComponent(ArtenVerwalten);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
