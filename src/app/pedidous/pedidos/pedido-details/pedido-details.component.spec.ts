import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidoDetailsComponent } from './pedido-details.component';

describe('PedidoDetailsComponent', () => {
  let component: PedidoDetailsComponent;
  let fixture: ComponentFixture<PedidoDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidoDetailsComponent]
    });
    fixture = TestBed.createComponent(PedidoDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
