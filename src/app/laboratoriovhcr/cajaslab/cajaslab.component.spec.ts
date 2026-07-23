import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CajaslabComponent } from './cajaslab.component';

describe('CajaslabComponent', () => {
  let component: CajaslabComponent;
  let fixture: ComponentFixture<CajaslabComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CajaslabComponent]
    });
    fixture = TestBed.createComponent(CajaslabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
