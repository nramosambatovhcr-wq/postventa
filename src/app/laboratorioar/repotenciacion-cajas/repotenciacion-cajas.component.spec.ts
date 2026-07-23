import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepotenciacionCajasComponent } from './repotenciacion-cajas.component';

describe('RepotenciacionCajasComponent', () => {
  let component: RepotenciacionCajasComponent;
  let fixture: ComponentFixture<RepotenciacionCajasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RepotenciacionCajasComponent]
    });
    fixture = TestBed.createComponent(RepotenciacionCajasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
