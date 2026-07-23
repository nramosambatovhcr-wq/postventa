import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Alldays2Component } from './alldays2.component';

describe('Alldays2Component', () => {
  let component: Alldays2Component;
  let fixture: ComponentFixture<Alldays2Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [Alldays2Component]
    });
    fixture = TestBed.createComponent(Alldays2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
