import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlvhcrinvoiceComponent } from './blvhcrinvoice.component';

describe('BlvhcrinvoiceComponent', () => {
  let component: BlvhcrinvoiceComponent;
  let fixture: ComponentFixture<BlvhcrinvoiceComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlvhcrinvoiceComponent]
    });
    fixture = TestBed.createComponent(BlvhcrinvoiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
