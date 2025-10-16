// src/app/services/tick.service.ts
import { Injectable } from '@angular/core';
import { interval, Subject } from 'rxjs';
import { BlueDepthBoardEnvironment } from '../../../enviroment';

@Injectable({
  providedIn: 'root'
})
export class TickService {
  private tickSubject = new Subject<number>();
  private tickCounter = 0;

  constructor() {
    interval(BlueDepthBoardEnvironment.timeUpdate).subscribe(() => {
      this.tickSubject.next(this.tickCounter++);
    });
  }

  get tick$() {
    return this.tickSubject.asObservable();
  }
}
