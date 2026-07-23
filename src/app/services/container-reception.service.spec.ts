import { TestBed } from '@angular/core/testing';

import { ContainerReceptionService } from './container-reception.service';

describe('ContainerReceptionService', () => {
  let service: ContainerReceptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContainerReceptionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
