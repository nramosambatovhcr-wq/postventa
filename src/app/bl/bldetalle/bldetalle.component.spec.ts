import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BldetalleComponent } from './bldetalle.component';

describe('BldetalleComponent', () => {
  let component: BldetalleComponent;
  let fixture: ComponentFixture<BldetalleComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BldetalleComponent]
    });
    fixture = TestBed.createComponent(BldetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
