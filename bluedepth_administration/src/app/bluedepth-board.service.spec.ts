import { TestBed } from '@angular/core/testing';

import { BluedepthBoardService } from './bluedepth-board.service';

describe('BluedepthBoardService', () => {
  let service: BluedepthBoardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BluedepthBoardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
