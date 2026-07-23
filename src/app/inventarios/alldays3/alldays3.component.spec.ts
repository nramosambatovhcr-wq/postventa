import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Alldays3Component } from './alldays3.component';

describe('Alldays3Component', () => {
  let component: Alldays3Component;
  let fixture: ComponentFixture<Alldays3Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [Alldays3Component]
    });
    fixture = TestBed.createComponent(Alldays3Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
