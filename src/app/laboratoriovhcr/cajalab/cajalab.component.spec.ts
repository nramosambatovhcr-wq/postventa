import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CajalabComponent } from './cajalab.component';

describe('CajalabComponent', () => {
  let component: CajalabComponent;
  let fixture: ComponentFixture<CajalabComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CajalabComponent]
    });
    fixture = TestBed.createComponent(CajalabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
