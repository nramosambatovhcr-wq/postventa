import { TestBed } from '@angular/core/testing';

import { PedidosoracleService } from './pedidosoracle.service';

describe('PedidosoracleService', () => {
  let service: PedidosoracleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PedidosoracleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
