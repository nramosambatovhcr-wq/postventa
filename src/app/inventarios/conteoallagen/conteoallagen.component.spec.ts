import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConteoallagenComponent } from './conteoallagen.component';

describe('ConteoallagenComponent', () => {
  let component: ConteoallagenComponent;
  let fixture: ComponentFixture<ConteoallagenComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ConteoallagenComponent]
    });
    fixture = TestBed.createComponent(ConteoallagenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
