import { Injectable } from '@angular/core';
import { QubitsConfiguration } from './qubits-configuration/QubitConfiguration';
import { EdCircuit, EdGate } from './circuit-editor/EdCircuit';

@Injectable({
  providedIn: 'root'
})
export class StoragesService {

  constructor() {
    this.qubitsConfiguration.updateQubits();
  }

  /******* Circuits editor ********/
  existingCircuits : EdCircuit[] = [];

  private loadCircuits() {
    let existingCircuits : any = localStorage.getItem('circuits');
    if (existingCircuits) {
      existingCircuits = JSON.parse(existingCircuits); 
      for (let i=0; i<existingCircuits.length; i++) {
        let circuit = Object.assign(new EdCircuit(), existingCircuits[i]);
        this.existingCircuits.push(circuit);
      }
    }
  }

  saveCircuit(circuit : EdCircuit) {
    for (let i=0; i<this.existingCircuits.length; i++) {
      if (this.existingCircuits[i].name == circuit.name) {
        this.existingCircuits[i] = circuit;
        localStorage.setItem('circuits', JSON.stringify(this.existingCircuits));
        return;
      }
    }
    this.existingCircuits.push(circuit);
    localStorage.setItem('circuits', JSON.stringify(this.existingCircuits));
  }
    
  openCircuit(circuit : EdCircuit) {
    for (let i=0; i<this.existingCircuits.length; i++) {
      if (this.existingCircuits[i].name == circuit.name) {
        return this.existingCircuits[i];
      }
    }
    return null;
  }  

  /******* Qubits configurations ***********/

  qubitsConfiguration: QubitsConfiguration = new QubitsConfiguration();
  existingConfigurations: QubitsConfiguration[] = [];

  private loadQubitsConf() {
    let existingConfigurations : any = localStorage.getItem('qubitsConfigurations');
    if (existingConfigurations) {
      existingConfigurations = JSON.parse(existingConfigurations); 
      for (let i=0; i<existingConfigurations.length; i++) {
        let cfg = Object.assign(new QubitsConfiguration(), existingConfigurations[i]);
        this.existingConfigurations.push(cfg);
      }
    }
  }
    
  saveQubitsConf(cfg : QubitsConfiguration) {
    for (let i=0; i<this.existingConfigurations.length; i++) {
      if (this.existingConfigurations[i].name == cfg.name) {
        this.existingConfigurations[i] = cfg;
        localStorage.setItem('qubitsConfigurations', JSON.stringify(this.existingConfigurations));
        return;
      }
    }
    this.existingConfigurations.push(cfg);
    localStorage.setItem('qubitsConfigurations', JSON.stringify(this.existingConfigurations));
  }
    
  openQubitsConfiguration(cfg : QubitsConfiguration) {
    for (let i=0; i<this.existingConfigurations.length; i++) {
      if (this.existingConfigurations[i].name == cfg.name) {
        this.qubitsConfiguration = this.existingConfigurations[i];
        return this.existingConfigurations[i];
      }
    }
    return undefined;
  }  
}
