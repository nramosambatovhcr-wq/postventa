import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvdashboardComponent } from './invdashboard.component';

describe('InvdashboardComponent', () => {
  let component: InvdashboardComponent;
  let fixture: ComponentFixture<InvdashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InvdashboardComponent]
    });
    fixture = TestBed.createComponent(InvdashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
