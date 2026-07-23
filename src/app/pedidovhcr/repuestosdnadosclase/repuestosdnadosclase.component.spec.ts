import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepuestosdnadosclaseComponent } from './repuestosdnadosclase.component';

describe('RepuestosdnadosclaseComponent', () => {
  let component: RepuestosdnadosclaseComponent;
  let fixture: ComponentFixture<RepuestosdnadosclaseComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RepuestosdnadosclaseComponent]
    });
    fixture = TestBed.createComponent(RepuestosdnadosclaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
