import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservadosComponent } from './reservados.component';

describe('ReservadosComponent', () => {
  let component: ReservadosComponent;
  let fixture: ComponentFixture<ReservadosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReservadosComponent]
    });
    fixture = TestBed.createComponent(ReservadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
