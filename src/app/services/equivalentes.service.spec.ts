import { TestBed } from '@angular/core/testing';

import { EquivalentesService } from './equivalentes.service';

describe('EquivalentesService', () => {
  let service: EquivalentesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EquivalentesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
