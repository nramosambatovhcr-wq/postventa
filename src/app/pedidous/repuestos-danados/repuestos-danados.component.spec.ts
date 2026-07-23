import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepuestosDanadosComponent } from './repuestos-danados.component';

describe('RepuestosDanadosComponent', () => {
  let component: RepuestosDanadosComponent;
  let fixture: ComponentFixture<RepuestosDanadosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RepuestosDanadosComponent]
    });
    fixture = TestBed.createComponent(RepuestosDanadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
