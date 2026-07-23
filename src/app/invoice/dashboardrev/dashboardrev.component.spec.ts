import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardrevComponent } from './dashboardrev.component';

describe('DashboardrevComponent', () => {
  let component: DashboardrevComponent;
  let fixture: ComponentFixture<DashboardrevComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardrevComponent]
    });
    fixture = TestBed.createComponent(DashboardrevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
