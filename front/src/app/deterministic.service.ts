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

  calculate(solver: string, qubits: number, expectedFrequencies: number[], physicalAngle: number, usePhysicalAngle: boolean) {
    let info = {
      qubits : qubits,
      expectedFrequencies : expectedFrequencies,
      physicalAngle : physicalAngle,
      usePhysicalAngle : usePhysicalAngle
    }
    return this.client.post<any>(environment.beUrl + this.controller + "/calculate?solver=" + solver, info, { withCredentials: true })
  }
}
