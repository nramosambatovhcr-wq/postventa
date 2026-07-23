import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidoboderrorComponent } from './pedidoboderror.component';

describe('PedidoboderrorComponent', () => {
  let component: PedidoboderrorComponent;
  let fixture: ComponentFixture<PedidoboderrorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidoboderrorComponent]
    });
    fixture = TestBed.createComponent(PedidoboderrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
