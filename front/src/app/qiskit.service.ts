import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QiskitService {
  constructor(private client : HttpClient) { }

  getQiskitMatrix(info : any) {
    return this.client.put<any>(environment.beUrl + "unitaryMatrix/getMatrix", info)
  }

  getCode(info : any) {
    return this.client.put<any>(environment.beUrl + "qiskit/getCode", info)
  }
}

