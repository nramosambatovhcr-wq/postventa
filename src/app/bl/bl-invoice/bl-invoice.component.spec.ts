import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlInvoiceComponent } from './bl-invoice.component';

describe('BlInvoiceComponent', () => {
  let component: BlInvoiceComponent;
  let fixture: ComponentFixture<BlInvoiceComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlInvoiceComponent]
    });
    fixture = TestBed.createComponent(BlInvoiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
