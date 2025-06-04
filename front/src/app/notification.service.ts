import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  getMessages(): Observable<string> {
    return new Observable<string>(observer => {
      const eventSource = new EventSource('http://localhost:8080/sse');

      eventSource.onmessage = event => observer.next(event.data);

      eventSource.onerror = error => {
        observer.error(error);
        eventSource.close();
      };

      return () => eventSource.close();
    });
  }
}
