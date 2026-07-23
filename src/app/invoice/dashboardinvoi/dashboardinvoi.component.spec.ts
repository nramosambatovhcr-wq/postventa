import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardinvoiComponent } from './dashboardinvoi.component';

describe('DashboardinvoiComponent', () => {
  let component: DashboardinvoiComponent;
  let fixture: ComponentFixture<DashboardinvoiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardinvoiComponent]
    });
    fixture = TestBed.createComponent(DashboardinvoiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
