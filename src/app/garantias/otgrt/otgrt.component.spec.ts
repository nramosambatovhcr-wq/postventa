import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtgrtComponent } from './otgrt.component';

describe('OtgrtComponent', () => {
  let component: OtgrtComponent;
  let fixture: ComponentFixture<OtgrtComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OtgrtComponent]
    });
    fixture = TestBed.createComponent(OtgrtComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
