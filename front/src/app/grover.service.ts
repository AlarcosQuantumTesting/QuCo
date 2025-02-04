import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GroverService {

  constructor(private client : HttpClient) { }

  getAllQuirk(info: any) {
    return this.client.put<any>(environment.beUrl + "grover/getAllQuirk", info)
  }

  getCode(info : any, type : string) {
    return this.client.put<any>(environment.beUrl + "grover/getCode?type=" + type, info)
  }

  getQiskitMatrix(info : any) {
    return this.client.put<any>(environment.beUrl + "grover/getQiskitMatrix", info)
  }
}
