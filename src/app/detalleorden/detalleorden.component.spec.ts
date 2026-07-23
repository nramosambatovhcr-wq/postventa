import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleordenComponent } from './detalleorden.component';

describe('DetalleordenComponent', () => {
  let component: DetalleordenComponent;
  let fixture: ComponentFixture<DetalleordenComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DetalleordenComponent]
    });
    fixture = TestBed.createComponent(DetalleordenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
