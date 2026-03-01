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
    return this.client.get<string[]>(environment.tp3Url + "qubitsConfigurations/getQubitConfigurationNames");
  }

  getQubitsConfiguration(cfgName: string) {
    return this.client.get<QubitsConfiguration>(environment.tp3Url + "qubitsConfigurations/getQubitsConfiguration/" + cfgName);
  }

  saveQubitsConfiguration(qubitsConfiguration : QubitsConfiguration) {
    return this.client.post(environment.tp3Url + "qubitsConfigurations/saveQubitsConfiguration", qubitsConfiguration);
  }

}
