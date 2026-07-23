import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetallescotComponent } from './detallescot.component';

describe('DetallescotComponent', () => {
  let component: DetallescotComponent;
  let fixture: ComponentFixture<DetallescotComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DetallescotComponent]
    });
    fixture = TestBed.createComponent(DetallescotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
