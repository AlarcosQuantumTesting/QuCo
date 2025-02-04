import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QiskitService {
  constructor(private client : HttpClient) { }

  getQiskitMatrix(info : any) {
    return this.client.put<any>(environment.beUrl + "unitaryMatrix/getMatrix", info)
  }
  
  getQiskitMatrixes(info : any) {
    return this.client.put<any>(environment.beUrl + "unitaryMatrix/getMatrixes", info)
  }

  getCode(info : any) {
    return this.client.put<any>(environment.beUrl + "qiskit/getCode", info)
  }
}

