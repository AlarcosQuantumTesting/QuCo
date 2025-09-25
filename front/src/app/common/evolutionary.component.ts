import { Chart, registerables } from "chart.js"
import { Individual } from "../common/Individual"
import { RemoteFitnesser } from "./RemoteFitnesser"
import { Gate } from "./Gate"
import { IService } from "./IService"
import { ProblemConfiguration } from "./ProblemConfiguration"
import { Strategy } from "./Strategy"
import { Component, ViewChildren, ElementRef, QueryList } from '@angular/core';

Chart.register(...registerables)

import { Directive } from '@angular/core';

@Directive()
export abstract class EvolutionaryComponent {
  @ViewChildren('card') cardElems!: QueryList<ElementRef>;
  pc : ProblemConfiguration = new ProblemConfiguration()

  mostrarModalCode: boolean = false;
  individuals : Individual[] = []
  selectedIndividual? : Individual
  selectedIndividualFitnesser? : string

  remoteFitnessers : RemoteFitnesser[] = []
  selectedRemoteFitnessers : RemoteFitnesser[] = []

  gates : Gate[] = []

  lastBestFitness : number = 0
  lastMeanFitness : number = 0

  bestFitnesses : any[] = []
  meanFitnesses : any[] = []
  meanErrors : any[] = []
  strategies : any[] = []

  stratego : string = "fixedStratego"

  existingStrategies : Strategy[] = []
  selectedStrategiesProbability : number = 100

  code : string = ""

  timesChart? : Chart

  state? : string 
  substate? : string
  error ? : string

  running : boolean = false
  private eventSource?: EventSource;

  math = Math
  _Array = Array

  constructor(public service : IService, controllerName : string) {
    this.service.controller = controllerName
    this.service.resetSession().subscribe(
      result=> {
        this.service.httpSessionId = result
        this.random()
        this.loadConf()
       this.eventSource = this.service.connectSSE();

        this.eventSource.onmessage = (event) => {
          if (this.running){
            this.substate = event.data;
            console.log("Event received: " + this.substate);
          }else{
            this.substate = undefined;
          }
        };
      },
      error => {
        this.state = undefined
        this.substate = undefined
        this.error = error.message + " (is the server running?)"
      }
    )
  }

  modifyProbability() {
    this.selectedStrategiesProbability = this.existingStrategies.reduce((sum, es) => sum + es.probability, 0)
  }

  moveUp(index : number) {
    const source = this.existingStrategies[index]
    this.existingStrategies[index] = this.existingStrategies[index-1]
    this.existingStrategies[index-1] = source
  }

  moveDown(index : number) {
    const source = this.existingStrategies[index]
    this.existingStrategies[index] = this.existingStrategies[index+1]
    this.existingStrategies[index+1] = source
  }


  reset() {
    this.error = undefined
    this.state = undefined

    this.bestFitnesses = []
    this.meanFitnesses = []
    this.meanErrors = []

    this.random()
  }

  private async loadGates(): Promise<void> {
    try {
        const result = await this.service.getGates().toPromise();
        this.error = undefined;
        this.gates = []
        for (let i=0; i<result.length; i++)
          this.gates.push(new Gate(result[i].name, false, result[i].affectedQubits))
    } catch (error: any) {
        this.state = undefined;
        this.substate = undefined;
        this.error = error?.error?.message || 'Error desconocido al cargar los gates.';
    }
  }

  protected async loadStrategies(): Promise<void> {
    try {
        const result = await this.service.getStrategies().toPromise();
        this.error = undefined;
        this.existingStrategies = []
        for (let i=0; i<result.length; i++)
          this.existingStrategies.push(new Strategy(result[i], 100/result.length))
        this.selectedStrategiesProbability = 100
    } catch (error: any) {
        this.state = undefined;
        this.substate = undefined;
        this.error = error?.error?.message || 'Error desconocido al cargar las strategies.';
    }
  }

  private async loadConf() {
    await this.loadGates()
    let savedConfig = localStorage.getItem("qucoConfiguration")

    if (savedConfig) {
      try {
        const conf = JSON.parse(savedConfig);
        const config = this.pc.inputConfiguration;

        config.qubits = conf.qubits;
        config.populationSize = conf.populationSize;
        config.maxPopulationSize = conf.maxPopulationSize;
        config.minNumberOfColumns = conf.minNumberOfColumns;
        config.maxNumberOfColumns = conf.maxNumberOfColumns;
        config.deleteFiles = conf.deleteFiles;
        config.shots = conf.shots;
        config.outputs = conf.outputs;
        config.expectedFrequencies = conf.expectedFrequencies;
        config.startWithH = conf.startWithH;


        if (conf.blockCircuit) {
          config.blockCircuit = { ...conf.blockCircuit };
        }

      } catch (error) {
        console.error('Error al parsear configuración desde localStorage:', error);
      }
    }

    let qucoGates = localStorage.getItem("qucoGates")
    if (qucoGates) {
      let parsedLocalGates = JSON.parse(qucoGates) as Array<any>

      for (let i=0; i<parsedLocalGates.length; i++)
        this.gates.find(g=> g.name==parsedLocalGates[i].name)!.selected = parsedLocalGates[i].selected
    }

    await this.loadStrategies()
    localStorage.setItem("selectedRemoteFitnessers", JSON.stringify(this.selectedRemoteFitnessers));
  }

  /*() {
    localStorage.setItem("qucoConfiguration", JSON.stringify(this.pc.inputConfiguration))
  }*/

  saveGates() {
    localStorage.setItem("qucoGates", JSON.stringify(this.gates))
  }

  getNumberOfSelectedFitnessers() : number {
    return this.remoteFitnessers.filter(rf=>rf.selected).length
  }

  async resetMatrix() {
    let outputsA1 = this.pc.inputConfiguration.outputs.filter(output => output).length
    let max = Math.pow(2, outputsA1)
    this.pc.inputConfiguration.expectedFrequencies = []
    for (let i=0; i<max; i++)
        this.pc.inputConfiguration.expectedFrequencies.push(0)
    this.calculateShots()
  }

  async random() {
    let outputsA1 = this.pc.inputConfiguration.outputs.filter(output => output).length
    let max = Math.pow(2, outputsA1)
    this.pc.inputConfiguration.expectedFrequencies = []
    for (let i=0; i<max; i++)
        this.pc.inputConfiguration.expectedFrequencies.push(Math.round(Math.random()*10))
    this.calculateShots()
    this.updateExpectedFrequencies()
  }

  async zeroTo2N() {
    let outputsA1 = this.pc.inputConfiguration.outputs.filter(output => output).length
    let max = Math.pow(2, outputsA1)
    this.pc.inputConfiguration.expectedFrequencies = []
    for (let i=1; i<=max; i++)
      this.pc.inputConfiguration.expectedFrequencies.push(i)
    this.calculateShots()
    this.updateExpectedFrequencies()
  }

  async updateExpectedFrequencies() {
        if (!this.remoteFitnesser) {
          try {
            const result = await this.service.getSimpleFitnesser().toPromise();
            console.log("SimpleFitnesser received:", result);

            if (result) {
              const fitnesser = new RemoteFitnesser(0, result.shortName);
              fitnesser.shortName = result.shortName;
              fitnesser.expectedFitness = result.expectedFitness;
              fitnesser.maxFitness = result.maxFitness;
              fitnesser.maxError = result.maxError;

              await this.selectFitnesser(fitnesser);
            } else {
              this.error = "No fitnesser available to select";
              return;
            }
          } catch (error: any) {
            this.state = undefined;
            this.substate = undefined;
            this.error = error?.error?.message || 'Error al obtener el SimpleFitnesser.';
            return;
          }
        }

        console.log("Updating expected frequencies with info:", this.pc.inputConfiguration.expectedFrequencies,
        "shots: ", this.pc.inputConfiguration.shots);

        this.service.updateExpectedFrequencies(
          this.pc.inputConfiguration.expectedFrequencies,
          this.pc.inputConfiguration.shots
        ).subscribe(
          result => this.updateRemoteFitnessers(result),
          error => {
            this.state = undefined;
            this.substate = undefined;
            this.error = error.error.message;
          }
    );
  }

  updateOutputs() {
    let outputsA1 = this.pc.inputConfiguration.outputs.filter(output => output).length

    //this.saveConf()

    let max = Math.pow(2, outputsA1)
    if (max<this.pc.inputConfiguration.expectedFrequencies.length) {
      this.pc.inputConfiguration.expectedFrequencies.splice(max)
    } else {
      let l = this.pc.inputConfiguration.expectedFrequencies.length
      for (let i=l; i<max; i++)
        this.pc.inputConfiguration.expectedFrequencies.push(0)
    }
    this.calculateShots()
    this.service.updateExpectedFrequencies(this.pc.inputConfiguration.expectedFrequencies, this.pc.inputConfiguration.shots).subscribe(
      result=> {
        this.updateRemoteFitnessers(result)
      },
      error => {
        this.state = undefined
        this.substate = undefined
        this.error = error.error.message
      }
    )

    if (localStorage.getItem("isBlocks") === "true") {
      //localStorage.setItem("qucoConfigurationBlocks", JSON.stringify(this.pc.inputConfiguration.blockCircuit))
    }

    console.log(this.remoteFitnesser);
  }

  private updateRemoteFitnessers(result: any) {
    if (!this.remoteFitnesser) return;
    if (!result) {
      console.warn("No data received to update remote fitnesser");
      return;
    }

    console.log("Updating remote fitnesser:", result);

    this.remoteFitnesser.expectedFitness = result.expectedFitness ?? this.remoteFitnesser.expectedFitness;
    this.remoteFitnesser.maxError = result.maxError ?? this.remoteFitnesser.maxError;
    this.remoteFitnesser.maxFitness = result.maxFitness ?? this.remoteFitnesser.maxFitness;
  }

  public calculateShots() {
    this.pc.inputConfiguration.shots = 0
    for (let i=0; i<this.pc.inputConfiguration.expectedFrequencies.length; i++)
      this.pc.inputConfiguration.shots = this.pc.inputConfiguration.shots + this.pc.inputConfiguration.expectedFrequencies[i]
  }

  remoteFitnesser?: RemoteFitnesser;

    selectFitnesser(rf: RemoteFitnesser): Promise<void> {
      rf.selected = true;
      this.remoteFitnesser = rf;

      return this.service.selectFitnesser(
        rf.name!,
        true,
        this.pc.inputConfiguration.shots,
        this.pc.desiredError,
        this.pc.inputConfiguration.expectedFrequencies,
        this.pc.inputConfiguration.populationSize
      ).toPromise().then(result => {
        this.error = undefined;
        if (result != null) {
          rf.shortName = result.shortName;
          rf.maxFitness = result.maxFitness;
          rf.maxError = result.maxError;
          rf.populationSize = result.populationSize;
          rf.expectedFitness = result.expectedFitness;
        }
        this.selectedRemoteFitnessers = [rf];
        console.log("Fitnesser selected: " + rf.name);
      }).catch(error => {
        this.state = undefined;
        this.substate = undefined;
        this.error = error.error.message;
      });
    }



  updateDesiredError() {
    this.service.updateDesiredError(this.pc.desiredError).subscribe(
      result=> {
        this.error = undefined
        this.updateRemoteFitnessers(result)
      },
      error => {
        this.state = undefined
        this.substate = undefined
        this.error = error.error.message
      }
    )
  }

  stop() {
    if (confirm('Are you sure you want to stop the execution?')) {
      this.service.resetSession().subscribe(
        result => {
          this.running = false
          this.state = "Process stopped"
          this.substate = undefined
        },
        error => {
          this.state = undefined
          this.substate = undefined
          this.error = error.error.message
        }
      )
    }
  }

  abstract generateInitialPopulation() : void

  firstRun() {
    this.state = "Running population..."
    this.service.firstRun().subscribe(
      result => {
        if (this.running)
          this.renderResults(result)
      },
      result => {
        this.state = undefined
        this.substate = undefined
        this.error = result.error.message
      }
    )
  }

  runPopulation() {
    this.state = "Running population..."
    this.service.runPopulation(this.pc, this.existingStrategies, this.stratego).subscribe(
      result => {
        if (this.running)
          this.renderResults(result)
      },
      result => {
        this.state = undefined
        this.substate = undefined
        this.error = result.error.message
      }
    )
  }

  protected renderResults(result : any) {
    let startRenderingTime = Date.now()
    if (!this.running) {
      this.reset()
      return      
    }
    this.error = undefined
    
    let lastExecutionResults = result.lastExecutionResults
    this.pc.updateLastExecutionResults(lastExecutionResults)

    let individual
    let rf : RemoteFitnesser
    
    rf = this.selectedRemoteFitnessers[0];
    let fitnesserResult
    this.individuals = []
    this.pc.inputConfiguration.populationSize = result.populationSize
    for (let i=0; i<this.pc.inputConfiguration.populationSize; i++)
      // this.individuals.push(new Individual(i, this.getNumberOfSelectedFitnessers()))
    this.individuals.push(new Individual(i))

    for (let i=0; i<this.individuals.length; i++) {
      individual = this.individuals[i]
      for (let j=0; j<this.selectedRemoteFitnessers.length; j++) {
        rf = this.selectedRemoteFitnessers[j]
        fitnesserResult = Reflect.get(lastExecutionResults, rf.name!)
        individual.gotFrequencies[j] = fitnesserResult.gotFrequencies[i]
        individual.error[j] = parseFloat(Number.parseFloat(fitnesserResult.errors[i]).toFixed(2))
        individual.fitness[j] = parseFloat(Number.parseFloat(fitnesserResult.fitnesses[i]).toFixed(2))
        individual.length[j] = fitnesserResult.lengths[i]
        individual.selected[j] = fitnesserResult.selecteds[i]
        
        if (individual.selected[j]) {
          this.selectedIndividual = individual
          this.selectedIndividualFitnesser = rf.name
        }
      }
    }
    
    let strategy
    let bestFitness
    let meanFitness
    let meanError
    for (let i=0; i<this.selectedRemoteFitnessers.length; i++) {
      rf = this.selectedRemoteFitnessers[i]
      strategy = lastExecutionResults[rf.name!].strategy
      bestFitness = parseFloat(Number(lastExecutionResults[rf.name!].bestFitness).toFixed(2))
      meanFitness = parseFloat(Number(lastExecutionResults[rf.name!].meanFitness).toFixed(2))
      meanError = parseFloat(Number(lastExecutionResults[rf.name!].meanError).toFixed(2))

      this.strategies[i].push(strategy)
      this.bestFitnesses[i].push(bestFitness)
      this.meanFitnesses[i].push(meanFitness)
      this.meanErrors[i].push(meanError)

      rf.bestFitnessReached= bestFitness
      rf.meanFitnessReached= meanFitness
      rf.meanErrorReached= meanError
      rf.updateChart(this.pc.sourceGeneration, this.pc.massiveMutationPolicy.fitnessPercentage, lastExecutionResults[rf.name!])
    }

    this.timesChart!.data.labels!.push(this.pc.sourceGeneration)
    this.timesChart!.data.datasets[0].data.push(result.executionTime)
    this.timesChart!.data.datasets[1].data.push(result.calculusTime)
    this.timesChart!.data.datasets[2].data.push(result.strategyTime)
    this.timesChart!.data.datasets[3].data.push(Date.now()-startRenderingTime)
    this.timesChart!.update()

    this.pc.iterationIndex++
    this.pc.sourceGeneration++
    this.pc.targetGeneration++

    if (this.selectedIndividual == undefined) {
      this.runPopulation()
    } else {
      this.state = "Solution found!"
      this.substate = "You can get the circuit code by clicking on the bailaora"
      this.running = false
    }
  }

  getCode(individual : Individual) {
    this.service.getCode(this.pc.targetGeneration-1, individual.index, this.selectedIndividualFitnesser!).subscribe(
      result => {
        this.error = undefined
        this.code = result
        this.mostrarModalCode = true;

        setTimeout(() => {
          const el = document.getElementById("codeArea");
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
          }
        }, 0);
      },
      result => {
        this.state = undefined
        this.substate = undefined
        this.error = JSON.parse(result.error).message
      }
    )

    this.mostrarModalCode = true;
  }

  isResultCode(individual : Individual, fitnesserIndex: number) {
    if(individual.selected[fitnesserIndex]) {
      this.getCode(individual);
    }
  }

  copyCode() {
    let wholeCode = document.getElementById("codeArea") 
    let range = document.createRange()
    range.selectNode(wholeCode!)
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    document.execCommand("copy")
    window.getSelection()!.removeAllRanges()
  }

  protected prepareCharts() {
    let rrff = this.selectedRemoteFitnessers
    for (let i=0; i<rrff.length; i++)
      rrff[i].prepareChart("chart" + i, rrff[i].shortName!)
    if (this.timesChart)
      this.timesChart.destroy()
    this.timesChart = new Chart("timesChart",
      {
       type : "line",
       options : {
         plugins : {
           title : {
             display : true,
             text : "Times (ms)"
           }
         },
         aspectRatio : 2.5
       },
       data : {
         labels : [],
         datasets : [
           { 
             data : [],
             label : "Execution time",
             backgroundColor : "orange"
           },
           {
            data : [],
            label : "Calculus time",
            backgroundColor : "red"
           },
           {
            data : [],
            label : "Strategy application time",
            backgroundColor : "blue"
           },
           {
            data : [],
            label : "Rendering (UA) time",
            backgroundColor : "green"
           }
         ]
       }
      })
  }
}