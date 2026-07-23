import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidoIndividualComponent } from './pedido-individual.component';

describe('PedidoIndividualComponent', () => {
  let component: PedidoIndividualComponent;
  let fixture: ComponentFixture<PedidoIndividualComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidoIndividualComponent]
    });
    fixture = TestBed.createComponent(PedidoIndividualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
