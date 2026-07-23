import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevisioncotComponent } from './revisioncot.component';

describe('RevisioncotComponent', () => {
  let component: RevisioncotComponent;
  let fixture: ComponentFixture<RevisioncotComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RevisioncotComponent]
    });
    fixture = TestBed.createComponent(RevisioncotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
