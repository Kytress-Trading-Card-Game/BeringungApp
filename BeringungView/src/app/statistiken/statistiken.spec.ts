import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Statistiken } from './statistiken';

describe('Statistiken', () => {
  let component: Statistiken;
  let fixture: ComponentFixture<Statistiken>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Statistiken],
    }).compileComponents();

    fixture = TestBed.createComponent(Statistiken);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
