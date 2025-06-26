import { TestBed } from '@angular/core/testing';

import { SonyApiService } from './sony-api.service';

describe('SonyApiService', () => {
  let service: SonyApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SonyApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
