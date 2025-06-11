import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Backend {
  id: number;
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranspileService {

    controller : string = "transpiler"

    constructor(private client: HttpClient) {}

    getBackends(): Observable<Backend[]> {
        return this.client.get<Backend[]>(environment.beUrl + this.controller + "/getBackends", { responseType : 'json' })
    }

    transpile(code: string, backends: string[], name?: string): Observable<string> {
        const body: any = {
        code,
        backends
        };
        if (name) {
        body.name = name;
        }
        return this.client.post(environment.beUrl + this.controller + "/transpile", body, { responseType: 'text' })
    }
}
