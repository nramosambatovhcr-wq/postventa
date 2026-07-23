import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConteoallComponent } from './conteoall.component';

describe('ConteoallComponent', () => {
  let component: ConteoallComponent;
  let fixture: ComponentFixture<ConteoallComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ConteoallComponent]
    });
    fixture = TestBed.createComponent(ConteoallComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
