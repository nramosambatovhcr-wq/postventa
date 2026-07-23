import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CabinalabComponent } from './cabinalab.component';

describe('CabinalabComponent', () => {
  let component: CabinalabComponent;
  let fixture: ComponentFixture<CabinalabComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CabinalabComponent]
    });
    fixture = TestBed.createComponent(CabinalabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
