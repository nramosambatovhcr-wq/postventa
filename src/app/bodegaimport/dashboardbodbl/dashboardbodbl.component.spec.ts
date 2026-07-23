import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardbodblComponent } from './dashboardbodbl.component';

describe('DashboardbodblComponent', () => {
  let component: DashboardbodblComponent;
  let fixture: ComponentFixture<DashboardbodblComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardbodblComponent]
    });
    fixture = TestBed.createComponent(DashboardbodblComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
