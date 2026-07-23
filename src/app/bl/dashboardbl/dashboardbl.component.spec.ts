import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardblComponent } from './dashboardbl.component';

describe('DashboardblComponent', () => {
  let component: DashboardblComponent;
  let fixture: ComponentFixture<DashboardblComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardblComponent]
    });
    fixture = TestBed.createComponent(DashboardblComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
