import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { Debug } from './debug';

describe('Debug', () => {
  let component: Debug;
  let fixture: ComponentFixture<Debug>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Debug],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Debug);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
