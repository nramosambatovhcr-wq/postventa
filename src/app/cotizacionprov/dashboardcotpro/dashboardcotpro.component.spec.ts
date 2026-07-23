import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardcotproComponent } from './dashboardcotpro.component';

describe('DashboardcotproComponent', () => {
  let component: DashboardcotproComponent;
  let fixture: ComponentFixture<DashboardcotproComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardcotproComponent]
    });
    fixture = TestBed.createComponent(DashboardcotproComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
