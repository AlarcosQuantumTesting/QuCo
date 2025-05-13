import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class QucoRequestService {
  constructor(private client : HttpClient) { }
  
  get() {
    this.client.get<any>(environment.beUrl + "qucorequests/get").subscribe()
  }
}
