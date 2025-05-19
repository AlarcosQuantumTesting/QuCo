import { Component, HostListener } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Individual } from '../common/Individual';
import { EvolutionaryService } from '../evolutionary.service';
import { EvolutionaryComponent } from '../common/evolutionary.component';
import { ManagerService } from '../manager.service';
import { CodeTemplate } from '../templates/CodeTemplate';

Chart.register(...registerables)

@Component({
  selector: 'app-elonging',
  templateUrl: './elonging.component.html',
  styleUrls: ['./elonging.component.css']
})
export class ElongingComponent extends EvolutionaryComponent {

  constructor(private evolutionaryService : EvolutionaryService, public manager : ManagerService) {
    super(evolutionaryService, "elonging")
  }

  mensajeTemporal: string = '';
  tooltipGenerationVisible: boolean = false;
  modalStrategyDetails: boolean = false;
  selectedOptionFreq: string = 'none';
  isNone: boolean = true;
  isRandom: boolean = false;
  isZeroTo2N: boolean = false;

  override generateInitialPopulation() {
    this.running = true
    this.state = "Generating initial population!"
    this.error = undefined

    if (this.selectedRemoteFitnessers.length==0 ) {
      this.error = "You must select one fitnesser at least"
    } else {
      let selectedGates = this.gates.filter(g => g.selected)
      let qubitGates = selectedGates.filter(g => g.affectedQubits==1)
      if (qubitGates.length==0)
        this.pc.probOf1QubitGates = 0
      qubitGates = selectedGates.filter(g => g.affectedQubits==2)
      if (qubitGates.length==0)
        this.pc.probOf2QubitGates = 0
      qubitGates = selectedGates.filter(g => g.affectedQubits==3)
      if (qubitGates.length==0)
        this.pc.probOf3QubitGates = 0
      qubitGates = selectedGates.filter(g => g.affectedQubits==1000)
      if (qubitGates.length==0)
        this.pc.probOfNQubitGates = 0

      if (this.evolutionaryService.ws==undefined || this.evolutionaryService.ws.readyState==WebSocket.CLOSED)
        this.evolutionaryService.connectWS()

      this.service.generateInitialPopulation(this.pc, selectedGates, this.manager.selectedTemplate).subscribe(
        result => {
          this.error = undefined
          this.state = undefined
          this.prepareCharts()
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
          if (result.error && result.error.message)
            this.error = result.error.message
          else
            this.error = result.message + " (is the server running?)"
        }
      )
    }
  }
     
  onTemplateChange(selected: CodeTemplate) {
    this.manager.selectedTemplate = this.manager.templates.find(t=> t.fileName==selected.fileName) || new CodeTemplate("", "", "")
  }

  toggleTooltipGeneration(event: MouseEvent): void {
    //this.tooltipVisible = !this.tooltipVisible;
    event.stopPropagation();

    if (this.tooltipGenerationVisible) {
      this.tooltipGenerationVisible = false;
      //this.tooltipVisible = false;
    } else {
      this.tooltipGenerationVisible = true;
      //this.tooltipVisible = false;
    }
  }

  @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
      // Verifica si el clic fue fuera del tooltip y el botón
      const tooltipElement = document.querySelector('.tooltip');
      const tooltipCustomElement = document.querySelector('.custom-tooltip');
      const buttonElement = document.querySelector('button');
      
  
      if (this.tooltipGenerationVisible &&
        tooltipCustomElement && !tooltipCustomElement.contains(event.target as Node) &&
          buttonElement && !buttonElement.contains(event.target as Node)) {
        this.tooltipGenerationVisible = false;
      }
    }

    onOptionFreqChange(value: string): void {
    
    this.isNone = value === 'none';
    this.isRandom = value === 'random';
    this.isZeroTo2N = value === 'zeroTo2N';
  }

  applyOption() {
    if (this.isNone) {
      this.resetMatrix();
    } else if (this.isRandom) {
      this.random();
    } else if (this.isZeroTo2N) {
      this.zeroTo2N();
    }

    localStorage.setItem('selectedOptionFreq', this.selectedOptionFreq);

  }
}
