import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DeterministicService {
  controller : string = "deterministic"

  constructor(private client: HttpClient) { }

  loadTemplates(): Observable<any[]> {
    return this.client.get<any[]>(environment.beUrl + this.controller + "/getTemplates", { responseType : 'json' })
  }

  calculate(qubits: number, expectedFrequencies: number[], physicalAngle: number, functionPrefix? : string) {
    let info = {
      qubits : qubits,
      expectedFrequencies : expectedFrequencies,
      physicalAngle : physicalAngle,
      functionPrefix : functionPrefix
    }
    return this.client.post<any>(environment.beUrl + this.controller + "/calculate", info, { withCredentials: true })
  }
}
