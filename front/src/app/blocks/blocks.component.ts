import { Component } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Individual } from '../common/Individual';
import { BlocksService } from './blocks.service';
import { EvolutionaryComponent } from '../common/evolutionary.component';
import { Gate } from '../common/Gate';

Chart.register(...registerables)

@Component({
  selector: 'app-blocks',
  templateUrl: './blocks.component.html',
  styleUrls: ['./blocks.component.css']
})
export class BlocksComponent extends EvolutionaryComponent {

  constructor(private blocksService : BlocksService) {
    super(blocksService, "blocks")
    this.pc.inputConfiguration.minNumberOfColumns = 1
    this.pc.inputConfiguration.maxNumberOfColumns = 3
  }

  updateNumberOfQubits() {
    let qubits = parseInt((document.getElementById("numberOfQubits") as HTMLInputElement).value)
    this.pc.inputConfiguration.blockCircuit.updateNumberOfQubits(qubits)
    this.pc.inputConfiguration.qubits = qubits
  }

  private findGate(e : any) : Gate | undefined {
    this.error = undefined
    let gate = undefined
    for (let i=0; i<this.gates.length; i++) {
      if (this.gates[i].name?.toUpperCase()==e.target.value.toUpperCase()) {
        gate = this.gates[i]
        break
      }
    }
    if (!gate)
      this.error = "That gate (" + e.target.value.toUpperCase() + ") does not exist"
    return gate
  }

  setGate(qubitIndex : number, columnIndex : number, e : any) {
    let gate = this.findGate(e)
    if (gate) 
      this.pc.inputConfiguration.blockCircuit.setStartGate(qubitIndex, columnIndex, gate)
  }

  setBlockGate(side : string, columnIndex : number, qubitIndex : number, e : any) {
    let gate = this.findGate(e)
    if (gate) {
      if (side=="left")
        this.pc.inputConfiguration.blockCircuit.block.leftColumns[columnIndex].gates[qubitIndex] = gate
      else
        this.pc.inputConfiguration.blockCircuit.block.rightColumns[columnIndex].gates[qubitIndex] = gate
    }
  }

  updateNumberOfBlocks() {
    this.pc.inputConfiguration.blockCircuit.updateNumberOfBlocks(this.pc.inputConfiguration.outputs.filter(output => output).length)
  }

  override generateInitialPopulation() {
    this.running = true
    this.state = "Generating initial population!"
    this.error = undefined

    if (this.selectedRemoteFitnessers.length==0 ) {
      this.error = "You must select one fitnesser at least"
    } else {
      this.prepareCharts()
      this.service.generateInitialPopulation(this.pc, this.gates.filter(g => g.selected)).subscribe(
        result => {
          this.error = undefined
          this.state = undefined
          for (let i=0; i<this.selectedRemoteFitnessers.length; i++) {
            this.strategies[i]=[]
            this.bestFitnesses[i]=[]
            this.meanFitnesses[i]=[]
            this.meanErrors[i]=[]
          }

          for (let i=0; i<this.pc.inputConfiguration.populationSize; i++) {
            this.individuals.push(new Individual(i, this.getNumberOfSelectedFitnessers()))
          }
          if (this.running)
            this.firstRun()
        },
        result => {
          this.state = undefined
          this.substate = undefined
          if (result.error?.message)
            this.error = result.error.message
          else
            this.error = result.message + " (is the server running?)"
        }
      )
    }
  }
}
