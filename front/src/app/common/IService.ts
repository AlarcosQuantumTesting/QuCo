import { Injectable } from '@angular/core';
import { ProblemConfiguration } from "./ProblemConfiguration"
import { Gate } from "./Gate"
import { HttpClient } from "@angular/common/http"
import { environment } from '../../environments/environment';
import { Strategy } from './Strategy';
import { CodeTemplate } from '../templates/CodeTemplate';


@Injectable({
    providedIn: 'root'
})
export abstract class IService {
    //ws?: WebSocket
    httpSessionId? : string
    controller?: string
    private eventSource?: EventSource;


    constructor(private client: HttpClient) { }


    connectSSE(): EventSource {
        if (!this.eventSource) {
            this.eventSource = new EventSource('http://localhost:8080/sse');
        }
        return this.eventSource;
    }

    /*connectWS() {
        let localUrl = environment.wsUrl
        //this.ws = new WebSocket(localUrl + "wstp3?httpSessionId=" + this.httpSessionId)
    }*/

    resetSession() {
        return this.client.get(environment.beUrl + this.controller + "/resetSession", { withCredentials: true, responseType: 'text' })
    }

    getGates() {
        return this.client.get<any>(environment.beUrl + this.controller + "/getGates", { withCredentials: true })
    }

    getStrategies() {
        return this.client.get<any>(environment.beUrl + this.controller + "/getStrategies", { withCredentials: true })
    }

    getFitnessers() {
        return this.client.get<any>(environment.beUrl + this.controller + "/getFitnessers", { withCredentials: true })
    }

    updateDesiredError(desiredError: number) {
        return this.client.get<any>(environment.beUrl + this.controller + "/updateDesiredError?desiredError=" + desiredError, { withCredentials: true })
    }

    updateExpectedFrequencies(expectedFrequencies: number[], shots: number) {
        let info = {
            expectedFrequencies: expectedFrequencies,
            shots: shots
        }
        return this.client.put<any>(environment.beUrl + this.controller + "/updateExpectedFrequencies", info, { withCredentials: true })
    }

    selectFitnesser(name: string, selected: boolean, shots: number, desiredError: number, expectedFrequencies: number[], populationSize: number) {
        let info = {
            name: name,
            selected: selected,
            shots: shots,
            desiredError: desiredError,
            expectedFrequencies: expectedFrequencies,
            populationSize: populationSize
        }
        return this.client.put<any>(environment.beUrl + this.controller + "/selectFitnesser", info, { withCredentials: true })
    }

    generateInitialPopulation(pc: ProblemConfiguration, gates: Gate[], template : CodeTemplate) {
        pc.gateNames = []
        for (let i = 0; i < gates.length; i++)
            pc.gateNames.push(gates[i].name!)
        pc.codeTemplate = template
        return this.client.put<any>(environment.beUrl + this.controller + "/generateInitialPopulation", pc, { withCredentials: true })
    }

    /*firstRun(pc: ProblemConfiguration) {
        return this.client.get<any>(environment.beUrl + this.controller + "/firstRun", { withCredentials: true })
    }*/

    firstRun() {
        return this.client.get<any>(environment.beUrl + this.controller + "/firstRun", { withCredentials: true })
    }

    runPopulation(pc: ProblemConfiguration, strategies : Strategy[], stratego : string) {
        let info : any[] = []
        let totalProbs = strategies.reduce((acc, st) => acc + st.probability, 0)
        for (let i=0; i<strategies.length; i++) {
            info.push({name : strategies[i].name, probability : strategies[i].probability/totalProbs})
        }

        let localUrl = environment.beUrl + this.controller + "/runPopulation?desiredError=" + pc.desiredError + "&selectedStratego=" + stratego
        return this.client.post<any>(localUrl, info, { withCredentials: true })
    }

    getCode(generation: number, index: number, fitnesserName: string) {
        return this.client.get(environment.beUrl + this.controller + "/getCode/" + generation + "/" + index + "?fitnesserName=" + fitnesserName,
            { responseType: 'text', withCredentials: true })
    }
}