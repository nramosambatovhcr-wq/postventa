import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardprovpedComponent } from './dashboardprovped.component';

describe('DashboardprovpedComponent', () => {
  let component: DashboardprovpedComponent;
  let fixture: ComponentFixture<DashboardprovpedComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardprovpedComponent]
    });
    fixture = TestBed.createComponent(DashboardprovpedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
