import { TestBed } from '@angular/core/testing';

import { AgentamientosService } from './agentamientos.service';

describe('AgentamientosService', () => {
  let service: AgentamientosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AgentamientosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
