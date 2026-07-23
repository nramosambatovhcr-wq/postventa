import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddProveedorComponent } from './add-proveedor.component';

describe('AddProveedorComponent', () => {
  let component: AddProveedorComponent;
  let fixture: ComponentFixture<AddProveedorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddProveedorComponent]
    });
    fixture = TestBed.createComponent(AddProveedorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
