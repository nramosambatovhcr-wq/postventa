import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardvehiComponent } from './dashboardvehi.component';

describe('DashboardvehiComponent', () => {
  let component: DashboardvehiComponent;
  let fixture: ComponentFixture<DashboardvehiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardvehiComponent]
    });
    fixture = TestBed.createComponent(DashboardvehiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
