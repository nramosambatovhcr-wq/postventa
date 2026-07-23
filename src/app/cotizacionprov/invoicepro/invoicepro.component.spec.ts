import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceproComponent } from './invoicepro.component';

describe('InvoiceproComponent', () => {
  let component: InvoiceproComponent;
  let fixture: ComponentFixture<InvoiceproComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InvoiceproComponent]
    });
    fixture = TestBed.createComponent(InvoiceproComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
