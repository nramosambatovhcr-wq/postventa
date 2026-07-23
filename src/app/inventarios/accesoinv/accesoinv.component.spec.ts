import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccesoinvComponent } from './accesoinv.component';

describe('AccesoinvComponent', () => {
  let component: AccesoinvComponent;
  let fixture: ComponentFixture<AccesoinvComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccesoinvComponent]
    });
    fixture = TestBed.createComponent(AccesoinvComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
