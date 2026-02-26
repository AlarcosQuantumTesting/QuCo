import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { FreqTable } from './deterministic/FreqTable';

@Injectable({
  providedIn: 'root'
})
export class DeterministicService {
  controller: string = "deterministic"

  constructor(private client: HttpClient) { }

  loadTemplates(): Observable<any[]> {
    return this.client.get<any[]>(environment.beUrl + this.controller + "/getTemplates", { responseType: 'json' })
  }

  calculate(
    qubits: number,
    expectedFrequencies: FreqTable,
    physicalAngle: number,
    inParallel: boolean,
    splitCircuits: boolean,
    algorithm: string,
    useMCX: boolean,
    functionPrefix?: string,
    template?: string
  ): Observable<Blob> {
    const info = {
      qubits,
      expectedFrequencies,
      physicalAngle,
      inParallel,
      splitCircuits,
      functionPrefix,
      algorithm,
      useMCX,
      template
    };
    let url = environment.beUrl + this.controller + '/newCalculate';

    return this.client.post(
      url,
      info,
      {
        responseType: 'blob',
      }
    );
  }
}
