import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgenciasbodComponent } from './agenciasbod.component';

describe('AgenciasbodComponent', () => {
  let component: AgenciasbodComponent;
  let fixture: ComponentFixture<AgenciasbodComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AgenciasbodComponent]
    });
    fixture = TestBed.createComponent(AgenciasbodComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
