import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtautdetalleComponent } from './otautdetalle.component';

describe('OtautdetalleComponent', () => {
  let component: OtautdetalleComponent;
  let fixture: ComponentFixture<OtautdetalleComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OtautdetalleComponent]
    });
    fixture = TestBed.createComponent(OtautdetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
