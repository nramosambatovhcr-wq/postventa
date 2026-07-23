import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlprodetailComponent } from './blprodetail.component';

describe('BlprodetailComponent', () => {
  let component: BlprodetailComponent;
  let fixture: ComponentFixture<BlprodetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlprodetailComponent]
    });
    fixture = TestBed.createComponent(BlprodetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
