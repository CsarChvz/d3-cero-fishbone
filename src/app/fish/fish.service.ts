import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FishService {
  private restartSource = new Subject<boolean>();
  restartRequest$ = this.restartSource.asObservable();

  constructor() {}

  restart() {
    this.restartSource.next(true);
  }
}
