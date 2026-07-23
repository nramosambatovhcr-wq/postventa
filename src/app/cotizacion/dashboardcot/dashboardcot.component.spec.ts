import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardcotComponent } from './dashboardcot.component';

describe('DashboardcotComponent', () => {
  let component: DashboardcotComponent;
  let fixture: ComponentFixture<DashboardcotComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardcotComponent]
    });
    fixture = TestBed.createComponent(DashboardcotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
