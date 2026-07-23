import { TestBed } from '@angular/core/testing';

import { ChecklistEnsamblajeService } from './checklist-ensamblaje.service';

describe('ChecklistEnsamblajeService', () => {
  let service: ChecklistEnsamblajeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChecklistEnsamblajeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
