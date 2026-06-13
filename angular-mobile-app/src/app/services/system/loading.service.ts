import { Injectable } from '@angular/core';
import { BehaviorSubject, delay, distinctUntilChanged } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private activeRequests = 0;

  private loadingSubject = new BehaviorSubject<boolean>(false);

  public isLoading$ = this.loadingSubject.asObservable().pipe(
    distinctUntilChanged(),
    delay(0),
  );

  public show(): void {
    this.activeRequests++;
    this.loadingSubject.next(true);
  }

  public hide(): void {
    this.activeRequests--;

    if (this.activeRequests <= 0) {
      this.activeRequests = 0;
      this.loadingSubject.next(false);
    }
  }
}