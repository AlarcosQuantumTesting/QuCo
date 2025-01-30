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

  getCode(info : any) {
    return this.client.put<any>(environment.beUrl + "grover/getCode", info)
  }

  getQiskitMatrix(info : any) {
    return this.client.put<any>(environment.beUrl + "grover/getQiskitMatrix", info)
  }
}
