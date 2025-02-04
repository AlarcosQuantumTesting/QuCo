import { Chart } from "chart.js"
import { ProblemConfiguration } from "./ProblemConfiguration"

export class RemoteFitnesser {
    index? : number
    name? : string
    shortName ? : string
    selected : boolean = false
    populationSize: number = 0
    maxFitness : number = 0
    maxError : number = 0
    expectedFitness : number = 0

    bestFitnessReached : number = 0
    meanFitnessReached : number = 0
    meanErrorReached : number = 0
    
    chart? : Chart

    constructor(index : number, name : string) {
        this.index = index
        this.name = name
    }

    updateChart(pc : ProblemConfiguration, lastExecutionResults : any) {
      this.chart!.data.labels!.push(pc.sourceGeneration + " " + this.initials(lastExecutionResults.strategy))
      this.chart!.data.datasets[0].data.push(lastExecutionResults.meanFitness)
      this.chart!.data.datasets[1].data.push(lastExecutionResults.meanError)
      this.chart!.data.datasets[2].data.push(this.expectedFitness)
      this.chart!.data.datasets[3].data.push(this.bestFitnessReached)
      this.chart!.data.datasets[4].data.push(pc.massiveMutationPolicy.fitnessPercentage*this.expectedFitness)
      this.chart!.update()
     }

     private initials(strategy : string) : string {
      switch(strategy) {
        case "BruteRoulette" : { return "BruteRou" }
        case "ClassicRoulette" : { return "ClassicRou" }
        case "Invasion" : { return "Inv" }
        case "Epidemy" : { return "Epi"} 
        case "MassiveMutation" : { return "MM"} 
        default : { return "FE" }
      }
    }

    prepareChart(name : string, title : string) {
      if (!this.chart)
        this.chart = new Chart(name, {
            type: 'line', //this denotes the type of chart
            options : {
              plugins: {
                title: {
                    display: true,
                    text: title
                }
              },
              aspectRatio : 2.5
            },
            data: {
              labels: [], 
              datasets: [
              {
                label: "Mean fitness",
                data: [],
                //borderColor : 'blue',
                backgroundColor: 'blue'
              },
              {
                label: "Mean error",
                data: [],
                //borderColor : 'red',
                backgroundColor: 'red'
              },
              {
                label : "Expected fitness",
                data : [],
                borderColor : "green",
                backgroundColor : "green",
                type : "line"
              },
              {
                label : "Best fitness",
                data : [],
                borderColor : "orange",
                backgroundColor : "orange",
                type : "line"
              },
              {
                label : "Massive mutation threshold",
                data : [],
                borderColor : "yellow",
                backgroundColor : "yellow",
                type : "line"
              }
            ]}
          });
        }
}