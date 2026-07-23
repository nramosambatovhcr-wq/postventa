import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoicevehiComponent } from './invoicevehi.component';

describe('InvoicevehiComponent', () => {
  let component: InvoicevehiComponent;
  let fixture: ComponentFixture<InvoicevehiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InvoicevehiComponent]
    });
    fixture = TestBed.createComponent(InvoicevehiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
