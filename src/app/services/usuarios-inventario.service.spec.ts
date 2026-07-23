import { TestBed } from '@angular/core/testing';

import { UsuariosInventarioService } from './usuarios-inventario.service';

describe('UsuariosInventarioService', () => {
  let service: UsuariosInventarioService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UsuariosInventarioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
