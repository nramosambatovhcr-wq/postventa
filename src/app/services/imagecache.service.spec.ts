import { TestBed } from '@angular/core/testing';

import { ImagecacheService } from './imagecache.service';

describe('ImagecacheService', () => {
  let service: ImagecacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImagecacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
