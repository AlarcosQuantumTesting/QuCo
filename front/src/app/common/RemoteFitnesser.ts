import { Chart } from "chart.js"

export class RemoteFitnesser {
  index?: number
  name?: string
  shortName?: string
  selected: boolean = false
  populationSize: number = 0
  maxFitness: number = 0
  maxError: number = 0
  expectedFitness: number = 0

  bestFitnessReached: number = 0
  meanFitnessReached: number = 0
  meanErrorReached: number = 0

  chart?: Chart

  constructor(index: number, name: string) {
    this.index = index
    this.name = name
  }

  updateChart(sourceGeneration: number, fitnessPercentage: number, lastExecutionResults: any) {
    let initials = lastExecutionResults.initials
    if (!initials)
      initials = "FE"
    this.chart!.data.labels!.push(sourceGeneration + " " + initials)
    this.chart!.data.datasets[0].data.push(lastExecutionResults.meanFitness)
    this.chart!.data.datasets[1].data.push(lastExecutionResults.meanError)
    this.chart!.data.datasets[2].data.push(this.expectedFitness)
    this.chart!.data.datasets[3].data.push(this.bestFitnessReached)
    this.chart!.data.datasets[4].data.push(fitnessPercentage * this.expectedFitness)
    this.chart!.update()
  }

  prepareChart(name: string, title: string) {
    if (this.chart)
      this.chart.destroy()

    if (!this.chart)
      this.chart = new Chart(name, {
        type: 'line', //this denotes the type of chart
        options: {
          plugins: {
            title: {
              display: true,
              text: title
            }
          },
          aspectRatio: 2.5
        },
        data: {
          labels: [],
          datasets: [
            {
              label: "Mean fitness",
              data: [],
              backgroundColor: '#2563eb', // Beautiful Deep Blue
              borderColor: '#2563eb'
            },
            {
              label: "Mean error",
              data: [],
              backgroundColor: '#dc2626', // Beautiful Deep Red
              borderColor: '#dc2626'
            },
            {
              label: "Expected fitness",
              data: [],
              borderColor: "#16a34a", // Beautiful Deep Green
              backgroundColor: "#16a34a",
              type: "line"
            },
            {
              label: "Best fitness",
              data: [],
              borderColor: "#ea580c", // Beautiful Deep Orange
              backgroundColor: "#ea580c",
              type: "line"
            },
            {
              label: "Massive mutation threshold",
              data: [],
              borderColor: "#9333ea", // Beautiful Deep Purple
              backgroundColor: "#9333ea",
              type: "line"
            }
          ]
        }
      });
  }
}