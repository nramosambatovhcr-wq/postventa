import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoicedetalleComponent } from './invoicedetalle.component';

describe('InvoicedetalleComponent', () => {
  let component: InvoicedetalleComponent;
  let fixture: ComponentFixture<InvoicedetalleComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InvoicedetalleComponent]
    });
    fixture = TestBed.createComponent(InvoicedetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
