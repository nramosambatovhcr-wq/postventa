import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlInvoiceexcelComponent } from './bl-invoiceexcel.component';

describe('BlInvoiceexcelComponent', () => {
  let component: BlInvoiceexcelComponent;
  let fixture: ComponentFixture<BlInvoiceexcelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlInvoiceexcelComponent]
    });
    fixture = TestBed.createComponent(BlInvoiceexcelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
