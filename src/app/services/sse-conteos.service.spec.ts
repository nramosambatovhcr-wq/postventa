import { TestBed } from '@angular/core/testing';

import { SseConteosService } from './sse-conteos.service';

describe('SseConteosService', () => {
  let service: SseConteosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SseConteosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
