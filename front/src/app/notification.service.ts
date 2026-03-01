import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {

  getMessages(): Observable<string> {
    return new Observable<string>(observer => {
      let url = environment.tp3Url + "sse"
      const eventSource = new EventSource(url);

      eventSource.onmessage = event => observer.next(event.data);

      eventSource.onerror = error => {
        observer.error(error);
        eventSource.close();
      };

      return () => eventSource.close();
    });
  }
}
