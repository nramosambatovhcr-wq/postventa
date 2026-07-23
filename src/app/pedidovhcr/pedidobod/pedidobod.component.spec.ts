import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidobodComponent } from './pedidobod.component';

describe('PedidobodComponent', () => {
  let component: PedidobodComponent;
  let fixture: ComponentFixture<PedidobodComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidobodComponent]
    });
    fixture = TestBed.createComponent(PedidobodComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
