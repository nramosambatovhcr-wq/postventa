import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlvhcrdetailComponent } from './blvhcrdetail.component';

describe('BlvhcrdetailComponent', () => {
  let component: BlvhcrdetailComponent;
  let fixture: ComponentFixture<BlvhcrdetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlvhcrdetailComponent]
    });
    fixture = TestBed.createComponent(BlvhcrdetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
