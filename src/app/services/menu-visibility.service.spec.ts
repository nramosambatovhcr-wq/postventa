import { TestBed } from '@angular/core/testing';

import { MenuVisibilityService } from './menu-visibility.service';

describe('MenuVisibilityService', () => {
  let service: MenuVisibilityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MenuVisibilityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
