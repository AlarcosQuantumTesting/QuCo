import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TranspilationService {

  controller : string = "transpiler"

  constructor(private client : HttpClient) { }

  getListOfTranspilationWorks() {
    return this.client.get<any[]>(environment.beUrl + this.controller + "/getListOfTranspilationWorks", { responseType : 'json' })
  }

  getTranspiledCode(id : any)  {
    return this.client.get<any>(environment.beUrl + this.controller + "/getTranspiledCode?id=" + id)
  }

  getErrors(id: any) {
    return this.client.get<any>(environment.beUrl + this.controller + "/getErrors?id=" + id)
  }

  cancelTranspilation(id: any) {
    return this.client.delete<any>(environment.beUrl + this.controller + "/cancelTranspilation?id=" + id)
  }

}
