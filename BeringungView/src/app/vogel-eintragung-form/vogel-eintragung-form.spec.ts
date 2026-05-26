import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VogelEintragungForm } from './vogel-eintragung-form';

describe('VogelEintragungForm', () => {
  let component: VogelEintragungForm;
  let fixture: ComponentFixture<VogelEintragungForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VogelEintragungForm],
    }).compileComponents();

    fixture = TestBed.createComponent(VogelEintragungForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
