import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Alldays1Component } from './alldays1.component';

describe('Alldays1Component', () => {
  let component: Alldays1Component;
  let fixture: ComponentFixture<Alldays1Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [Alldays1Component]
    });
    fixture = TestBed.createComponent(Alldays1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
