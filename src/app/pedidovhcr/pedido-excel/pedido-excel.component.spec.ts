import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidoExcelComponent } from './pedido-excel.component';

describe('PedidoExcelComponent', () => {
  let component: PedidoExcelComponent;
  let fixture: ComponentFixture<PedidoExcelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidoExcelComponent]
    });
    fixture = TestBed.createComponent(PedidoExcelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
