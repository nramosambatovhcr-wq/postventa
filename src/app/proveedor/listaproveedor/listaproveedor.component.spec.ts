import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaproveedorComponent } from './listaproveedor.component';

describe('ListaproveedorComponent', () => {
  let component: ListaproveedorComponent;
  let fixture: ComponentFixture<ListaproveedorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ListaproveedorComponent]
    });
    fixture = TestBed.createComponent(ListaproveedorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
