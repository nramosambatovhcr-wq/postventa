import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardtaskComponent } from './dashboardtask.component';

describe('DashboardtaskComponent', () => {
  let component: DashboardtaskComponent;
  let fixture: ComponentFixture<DashboardtaskComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardtaskComponent]
    });
    fixture = TestBed.createComponent(DashboardtaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
