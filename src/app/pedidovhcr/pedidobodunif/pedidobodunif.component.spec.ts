import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidobodunifComponent } from './pedidobodunif.component';

describe('PedidobodunifComponent', () => {
  let component: PedidobodunifComponent;
  let fixture: ComponentFixture<PedidobodunifComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidobodunifComponent]
    });
    fixture = TestBed.createComponent(PedidobodunifComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
