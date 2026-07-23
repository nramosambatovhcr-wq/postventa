import { TestBed } from '@angular/core/testing';

import { PedidosPdiService } from './pedidos-pdi.service';

describe('PedidosPdiService', () => {
  let service: PedidosPdiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PedidosPdiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
