import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevblupdateComponent } from './revblupdate.component';

describe('RevblupdateComponent', () => {
  let component: RevblupdateComponent;
  let fixture: ComponentFixture<RevblupdateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RevblupdateComponent]
    });
    fixture = TestBed.createComponent(RevblupdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
