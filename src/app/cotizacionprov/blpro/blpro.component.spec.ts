import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlproComponent } from './blpro.component';

describe('BlproComponent', () => {
  let component: BlproComponent;
  let fixture: ComponentFixture<BlproComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlproComponent]
    });
    fixture = TestBed.createComponent(BlproComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
