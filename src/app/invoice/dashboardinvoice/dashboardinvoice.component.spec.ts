import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardinvoiceComponent } from './dashboardinvoice.component';

describe('DashboardinvoiceComponent', () => {
  let component: DashboardinvoiceComponent;
  let fixture: ComponentFixture<DashboardinvoiceComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardinvoiceComponent]
    });
    fixture = TestBed.createComponent(DashboardinvoiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
