import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardbodimpComponent } from './dashboardbodimp.component';

describe('DashboardbodimpComponent', () => {
  let component: DashboardbodimpComponent;
  let fixture: ComponentFixture<DashboardbodimpComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardbodimpComponent]
    });
    fixture = TestBed.createComponent(DashboardbodimpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
