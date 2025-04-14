import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { QiskitCode } from './grover/QiskitCode';

@Injectable({
  providedIn: 'root'
})
export class GroverService {

  constructor(private client : HttpClient) { }

  getAllQuirk(info: any, useMCX : boolean, splitting : boolean) {
    return this.client.put<any>(environment.beUrl + "grover/getAllQuirk?useMCX=" + useMCX + "&splitting=" + splitting, info)
  }

  getCode(info : any, useMCX : boolean, splitting : boolean) {
    return this.client.put<any>(environment.beUrl + "grover/getCode?useMCX=" + useMCX + "&splitting=" + splitting, info)
  }

  getQiskitMatrix(info : any) {
    return this.client.put<any>(environment.beUrl + "grover/getQiskitMatrix", info)
  }
}
