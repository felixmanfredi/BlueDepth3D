import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ErrorMonitorService {
  private healthStatus = new BehaviorSubject<boolean>(true);
  public healthStatus$ = this.healthStatus.asObservable();

  setHealthStatus(status: boolean): void {
    this.healthStatus.next(status);
  }

  getHealthStatus(): boolean {
    return this.healthStatus.value;
  }
}
