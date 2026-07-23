import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlvhcrupdateComponent } from './blvhcrupdate.component';

describe('BlvhcrupdateComponent', () => {
  let component: BlvhcrupdateComponent;
  let fixture: ComponentFixture<BlvhcrupdateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlvhcrupdateComponent]
    });
    fixture = TestBed.createComponent(BlvhcrupdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
