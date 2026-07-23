import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoicePaqtanaComponent } from './invoice-paqtana.component';

describe('InvoicePaqtanaComponent', () => {
  let component: InvoicePaqtanaComponent;
  let fixture: ComponentFixture<InvoicePaqtanaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InvoicePaqtanaComponent]
    });
    fixture = TestBed.createComponent(InvoicePaqtanaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
