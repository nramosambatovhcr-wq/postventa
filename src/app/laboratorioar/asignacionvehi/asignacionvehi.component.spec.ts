import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsignacionvehiComponent } from './asignacionvehi.component';

describe('AsignacionvehiComponent', () => {
  let component: AsignacionvehiComponent;
  let fixture: ComponentFixture<AsignacionvehiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AsignacionvehiComponent]
    });
    fixture = TestBed.createComponent(AsignacionvehiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
