import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlInvoicebldetailComponent } from './bl-invoicebldetail.component';

describe('BlInvoicebldetailComponent', () => {
  let component: BlInvoicebldetailComponent;
  let fixture: ComponentFixture<BlInvoicebldetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlInvoicebldetailComponent]
    });
    fixture = TestBed.createComponent(BlInvoicebldetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
