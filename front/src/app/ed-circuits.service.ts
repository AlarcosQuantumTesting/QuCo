import { Injectable } from '@angular/core';
import { EdCircuit } from './circuit-editor/EdCircuit';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EdCircuitsService {
  constructor(private client : HttpClient) { }
  
  saveCircuit(circuit: EdCircuit) {
    return this.client.post(environment.beUrl + "circuits/saveCircuit", circuit);
  }

  getCircuitNames() {
    return this.client.get<string[]>(environment.beUrl + "circuits/getCircuitNames");
  }

  getCircuit(name: string) {
    return this.client.get<EdCircuit>(environment.beUrl + "circuits/getCircuit/" + name);
  }
}
