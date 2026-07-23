import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoicecrearComponent } from './invoicecrear.component';

describe('InvoicecrearComponent', () => {
  let component: InvoicecrearComponent;
  let fixture: ComponentFixture<InvoicecrearComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InvoicecrearComponent]
    });
    fixture = TestBed.createComponent(InvoicecrearComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
