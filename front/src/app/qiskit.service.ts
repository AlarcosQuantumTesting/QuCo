import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { QiskitCode } from './grover/QiskitCode';
import { EdGate } from './circuit-editor/EdCircuit';

@Injectable({
  providedIn: 'root'
})
export class QiskitService {
  constructor(private client : HttpClient) { }

  saveGate(gate: EdGate) {
    let code = new QiskitCode()
    code.name = gate.name!
    code.lines = gate.code.split("\n")
    code.description = gate.description
    code.qubits = gate.qubits
    return this.client.post<any>(environment.tp3Url + "qiskit/saveCode", code)
  }

  deleteFromServer(gate: EdGate) {
    return this.client.delete<any>(environment.tp3Url + "qiskit/deleteGate/" + gate.name)
  }

  getQiskitMatrix(info : any) {
    return this.client.put<any>(environment.tp3Url + "unitaryMatrix/getMatrix", info)
  }

  getCode(info : any) {
    return this.client.put<any>(environment.tp3Url + "qiskit/getCode", info)
  }

  getCodeByName(name: string) {
    return this.client.get<any>(`${environment.tp3Url}qiskit/getCodeByName/${name}`);
  }

  saveCode(qiskitCode : QiskitCode) {
    return this.client.post<any>(environment.tp3Url + "qiskit/saveCode", qiskitCode)
  }

  getCustomizedGates() {
    return this.client.get<any[]>(environment.tp3Url + "qiskit/getCustomizedGates")
  }
}

