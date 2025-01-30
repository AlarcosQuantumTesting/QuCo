import { RemoteFitnesser } from "./RemoteFitnesser"

export class ProblemConfiguration {
    
    iterationIndex : number = 0
    sourceGeneration : number = 0
    targetGeneration : number = 0
	
    desiredError : number = 0.05

	use1QubitGates : boolean = true
	use2QubitGates : boolean = true
	use3QubitGates : boolean = false
    
	inputConfiguration : InputConfiguration = new InputConfiguration()

	massiveMutationPolicy: MassiveMutationPolicy = new MassiveMutationPolicy()   
    history : Map<string, History> = new Map<string, History>() 
    lastExecutionResults : Map<string, ExecutionResults> = new Map<string, ExecutionResults>();

    updateHistory(receivedHistory : any) {
        let keys = Object.keys(receivedHistory)
        for (let fitnesserName of keys) {
            let history = Object.assign(new History(), Reflect.get(receivedHistory, fitnesserName))
            this.history.set(fitnesserName, history)    
        }
    }

    updateLastExecutionResults(receivedLastExecutionResults : any) {
        let keys = Object.keys(receivedLastExecutionResults)
        for (let fitnesserName of keys) {
            let er = Object.assign(new ExecutionResults(), Reflect.get(receivedLastExecutionResults, fitnesserName))
            er.selectionProbabilities = er.selectionProbabilities.map(function(v : any) { return parseFloat(Number.parseFloat(v).toFixed(2))} )
            er.fitnesses = er.fitnesses.map(function(v : any) { return parseFloat(Number.parseFloat(v).toFixed(2))} )
            er.errors = er.errors.map(function(v : any) { return parseFloat(Number.parseFloat(v).toFixed(2))} )
            this.lastExecutionResults.set(fitnesserName, er)             
        }
    }
}

export class InputConfiguration {
    qubits : number = 5
    outputs : boolean[] = []
    startWithH : boolean[] = []
    expectedFrequencies : number[] = []
    childrenPerCouple : number = 3
    populationSize : number = 4
    maxPopulationSize : number = 24
    minNumberOfColumns : number = 4
    maxNumberOfColumns : number = 20
    deleteFiles : boolean = false
    shots : number = 99

    constructor() {
        this.reset()
    }

    reset() {
        for (let i=0; i<this.qubits; i++) {
            this.outputs[i] = true
            this.startWithH[i] = false
        }
        this.outputs[0] = false
        this.outputs[1] = false
    }
}

export class MassiveMutationPolicy {
    fallsThreshold : number = 2  // Número de caídas tras las que se aplica
	
	applicableWhenMeanFitnessFalls : boolean = true
	applicableWhenBestFitnessFalls : boolean = true
	
	fitnessPercentage : number = 0.85  // Aplicar cuando el mejor fitness supere este porcentaje del fitness deseado
	
	maxConsecutiveApplications : number = 1
	counter : number = 0
}

export class History {
    fitnesserName : string = ""
    meanFitnessDecrements : number = 0
	bestFitnessDecrements : number = 0
    bestGeneration : number = 0
    bestIndividual : number = 0
    bestFitness : number = 0
    lastMeanFitness : number = 0
    lastBestFitness : number = 0
    fitnesses : number[] = []

    load(history : any) {
        this.fitnesserName = history.fitnesserName
        this.meanFitnessDecrements = history.meanFitnessDecrements
        this.bestFitnessDecrements = history.bestFitnessDecrements
        this.bestGeneration = history.bestGeneration
        this.bestIndividual = history.bestIndividual
        this.bestFitness = history.bestFitness
        this.lastMeanFitness = history.lastMeanFitness
        this.lastBestFitness = history.lastBestFitness
        this.fitnesses = history.fitnesses
    }
}

export class ExecutionResults {
    fitnesserName : string = ""
    errors : number[] = []
	fitnesses : number[] = []
	gotFrequencies : number[] = []
	selecteds : boolean[] = []
	bestFitness : number = 0
	bestIndividual : number = 0
	selectionProbabilities : number[] = []
	meanError : number = 0
	meanFitness : number = 0
    strategy : string = "";
}