import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { FreqTable } from './deterministic/FreqTable';

@Injectable({
  providedIn: 'root'
})
export class DeterministicService {
  controller : string = "deterministic"

  constructor(private client: HttpClient) { }

  loadTemplates(): Observable<any[]> {
    return this.client.get<any[]>(environment.beUrl + this.controller + "/getTemplates", { responseType : 'json' })
  }

  calculate(qubits: number, expectedFrequencies: FreqTable, physicalAngle: number, originalGR : boolean, splitCircuits : boolean, functionPrefix? : string) {
    let info = {
      qubits : qubits,
      expectedFrequencies : expectedFrequencies,
      physicalAngle : physicalAngle,
      functionPrefix : functionPrefix,
      originalGR : originalGR
    }
    let url = environment.beUrl + this.controller + "/calculate"
    if (splitCircuits)
      url = url + "Splitting"
    return this.client.post<any>(url, info, { withCredentials: true })
  }
}
