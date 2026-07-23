import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardlabComponent } from './dashboardlab.component';

describe('DashboardlabComponent', () => {
  let component: DashboardlabComponent;
  let fixture: ComponentFixture<DashboardlabComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardlabComponent]
    });
    fixture = TestBed.createComponent(DashboardlabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
