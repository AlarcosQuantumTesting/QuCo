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
            let url = environment.tp3Url + "sse"
            this.eventSource = new EventSource(url);
        }
        return this.eventSource;
    }

    resetSession() {
        return this.client.get(environment.tp3Url + this.controller + "/resetSession", { withCredentials: true, responseType: 'text' })
    }

    getGates() {
        return this.client.get<any>(environment.tp3Url + this.controller + "/getGates", { withCredentials: true })
    }

    getStrategies() {
        return this.client.get<any>(environment.tp3Url + this.controller + "/getStrategies", { withCredentials: true })
    }

    updateDesiredError(desiredError: number) {
        return this.client.get<any>(environment.tp3Url + this.controller + "/updateDesiredError?desiredError=" + desiredError, { withCredentials: true })
    }

    updateExpectedFrequencies(expectedFrequencies: number[], shots: number) {
        let info = {
            expectedFrequencies: expectedFrequencies,
            shots: shots
        }
        return this.client.put<any>(environment.tp3Url + this.controller + "/updateExpectedFrequencies", info,  { withCredentials: true });
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
        return this.client.put<any>(environment.tp3Url + this.controller + "/selectFitnesser", info, { withCredentials: true })
    }

    generateInitialPopulation(pc: ProblemConfiguration) {
        return this.client.put<any>(environment.tp3Url + this.controller + "/generateInitialPopulation", pc, { withCredentials: true })
    }
    
    firstRun() {
        return this.client.get<any>(environment.tp3Url + this.controller + "/firstRun", { withCredentials: true })
    }

    runPopulation(pc: ProblemConfiguration, strategies : Strategy[], stratego : string) {
        let info : any[] = []
        let totalProbs = strategies.reduce((acc, st) => acc + st.probability, 0)
        for (let i=0; i<strategies.length; i++) {
            info.push({name : strategies[i].name, probability : strategies[i].probability/totalProbs})
        }

        let localUrl = environment.tp3Url + this.controller + "/runPopulation?desiredError=" + pc.desiredError + "&selectedStratego=" + stratego
        return this.client.post<any>(localUrl, info, { withCredentials: true })
    }

    getCode(generation: number, index: number, fitnesserName: string) {
        return this.client.get(environment.tp3Url + this.controller + "/getCode/" + generation + "/" + index + "?fitnesserName=" + fitnesserName,
            { responseType: 'text', withCredentials: true })
    }

    getSimpleFitnesser() {
        return this.client.get<any>(environment.tp3Url + this.controller + "/getSimpleFitnesser", { withCredentials: true })
    }
}