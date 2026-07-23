import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidobodproComponent } from './pedidobodpro.component';

describe('PedidobodproComponent', () => {
  let component: PedidobodproComponent;
  let fixture: ComponentFixture<PedidobodproComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidobodproComponent]
    });
    fixture = TestBed.createComponent(PedidobodproComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
