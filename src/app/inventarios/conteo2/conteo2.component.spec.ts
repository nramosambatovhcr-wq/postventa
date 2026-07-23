import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Conteo2Component } from './conteo2.component';

describe('Conteo2Component', () => {
  let component: Conteo2Component;
  let fixture: ComponentFixture<Conteo2Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [Conteo2Component]
    });
    fixture = TestBed.createComponent(Conteo2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
