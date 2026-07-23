import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoicexcelComponent } from './invoicexcel.component';

describe('InvoicexcelComponent', () => {
  let component: InvoicexcelComponent;
  let fixture: ComponentFixture<InvoicexcelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InvoicexcelComponent]
    });
    fixture = TestBed.createComponent(InvoicexcelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
