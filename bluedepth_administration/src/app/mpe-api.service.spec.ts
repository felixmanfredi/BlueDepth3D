import { TestBed } from '@angular/core/testing';

import { MpeApiService } from './mpe-api.service';

describe('MpeApiService', () => {
  let service: MpeApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MpeApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
