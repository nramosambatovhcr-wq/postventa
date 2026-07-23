import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiquidadoComponent } from './liquidado.component';

describe('LiquidadoComponent', () => {
  let component: LiquidadoComponent;
  let fixture: ComponentFixture<LiquidadoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LiquidadoComponent]
    });
    fixture = TestBed.createComponent(LiquidadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
