import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class QuirkService {
  constructor(private client : HttpClient) { }
  
  getEmptyMatrix(outputQubits : number, inputQubits : number) {
    return this.client.get<any>(environment.beUrl + "classicMatrix/getEmptyMatrix?outputQubits=" + outputQubits +
      "&inputQubits=" + inputQubits)
  }

  getQuirk(info: any) {
    return this.client.put<any>(environment.beUrl + "quirk/getQuirk", info)
  }
  
  getAllQuirk(info: any) {
    return this.client.put<any>(environment.beUrl + "quirk/getAllQuirk", info)
  }
}
