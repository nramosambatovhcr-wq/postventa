import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidopdicreateComponent } from './pedidopdicreate.component';

describe('PedidopdicreateComponent', () => {
  let component: PedidopdicreateComponent;
  let fixture: ComponentFixture<PedidopdicreateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidopdicreateComponent]
    });
    fixture = TestBed.createComponent(PedidopdicreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
