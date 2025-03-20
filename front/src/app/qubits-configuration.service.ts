import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { QubitsConfiguration } from './qubits-configuration/QubitConfiguration';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QubitsConfigurationService {
  constructor(private client : HttpClient) { }

  getQubitConfigurationNames() {
    return this.client.get<string[]>(environment.beUrl + "qubitsConfigurations/getQubitConfigurationNames");
  }

  getQubitsConfiguration(cfgName: string) {
    return this.client.get<QubitsConfiguration>(environment.beUrl + "qubitsConfigurations/getQubitsConfiguration/" + cfgName);
  }

  saveQubitsConfiguration(qubitsConfiguration : QubitsConfiguration) {
    return this.client.post(environment.beUrl + "qubitsConfigurations/saveQubitsConfiguration", qubitsConfiguration);
  }

}
