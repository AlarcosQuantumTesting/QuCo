import { BlockCircuit } from "../blocks/BlockCircuit"
import { CodeTemplate } from "../templates/CodeTemplate"

export class ProblemConfiguration {
    iterationIndex : number = 0
    sourceGeneration : number = 0
    targetGeneration : number = 0
	
    desiredError : number = 0.05

	probOf1QubitGates : number = 50
	probOf2QubitGates : number = 50
	probOf3QubitGates : number = 20
    probOfNQubitGates : number = 20

    inputConfiguration : ProblemInputConfiguration 

	massiveMutationPolicy: MassiveMutationPolicy = new MassiveMutationPolicy()   
    history : Map<string, History> = new Map<string, History>() 
    lastExecutionResults : Map<string, ExecutionResults> = new Map<string, ExecutionResults>();

    gateNames : string[] = []
    codeTemplate? : CodeTemplate

    constructor(conf? : any) {
        this.inputConfiguration = new ProblemInputConfiguration()
        if (conf) {
            this.inputConfiguration.qubits = conf.qubits
            this.inputConfiguration.populationSize = conf.populationSize
            this.inputConfiguration.minNumberOfColumns = conf.minNumberOfColumns
            this.inputConfiguration.maxNumberOfColumns = conf.maxNumberOfColumns
            this.inputConfiguration.maxPopulationSize = conf.maxPopulationSize
            this.inputConfiguration.minNumberOfColumns = conf.minNumberOfColumns
            this.inputConfiguration.deleteFiles = conf.deleteFiles
            for (let i=0; i<conf.startWithH.length; i++)
                this.inputConfiguration.startWithH[i] = conf.startWithH[i]
            for (let i=0; i<conf.expectedFrequencies.length; i++)
                this.inputConfiguration.expectedFrequencies[i] = conf.expectedFrequencies[i]
            for (let i=0; i<conf.outputs.length; i++)
                this.inputConfiguration.outputs[i] = conf.outputs[i]
        }
    }

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

export class ProblemInputConfiguration {
    qubits : number 
    outputs : boolean[] 
    expectedFrequencies : number[] = []
    populationSize : number = 24
    maxPopulationSize : number = 24
    minNumberOfColumns : number = 4
    maxNumberOfColumns : number = 20
    deleteFiles : boolean = true
    shots : number = 99

    startWithH : boolean[] = []
    blockCircuit : BlockCircuit

    constructor() {
        
        const config = JSON.parse(localStorage.getItem("qucoConfiguration") || "{}");
        
        if (config) {
            this.qubits = config.qubits || 5
            this.populationSize = config.populationSize || 24
            this.maxPopulationSize = config.maxPopulationSize || 24
            this.minNumberOfColumns = config.minNumberOfColumns || 4
            this.maxNumberOfColumns = config.maxNumberOfColumns || 20
            this.deleteFiles = config.deleteFiles || true
            this.shots = config.shots || 99
            this.startWithH = config.startWithH || []
            this.expectedFrequencies = config.expectedFrequencies || []
            this.outputs = config.outputs || [false, false, true, true, true]
            for (let i=0; i<this.qubits; i++) {
                if (this.startWithH.length <= i) {
                    this.startWithH[i] = false
                }
                if (this.expectedFrequencies.length <= i) {
                    this.expectedFrequencies[i] = 0.5
                }
            }
            this.blockCircuit = new BlockCircuit(this.qubits)
        } else {
            this.qubits = 5
            this.outputs = [false, false, true, true, true]
            this.blockCircuit = new BlockCircuit(this.qubits)
        }
        
    }

    updateNumberOfQubits(qubits : number) {
        this.blockCircuit.updateNumberOfQubits(qubits)
        this.qubits = qubits
    }

    reset() {
        this.blockCircuit = new BlockCircuit(this.qubits)
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
	
	fitnessPercentage : number = 0.75  // Aplicar cuando el mejor fitness supere este porcentaje del fitness deseado
	
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