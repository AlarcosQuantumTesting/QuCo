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

  ngAfterViewInit(): void {
    this.tieneFrecuenciasEsperadas()
    const tabs = document.querySelectorAll<HTMLButtonElement>(".tab");
    const contents = document.querySelectorAll<HTMLElement>(".tab-content");

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const selectedIndex = parseInt(tab.dataset['tab'] || "0");

        tabs.forEach((t, i) => {
          t.classList.toggle("active", i === selectedIndex);
          contents[i].classList.toggle("active", i === selectedIndex);
        });
      });
    });
  }

  ngOnInit () {

    this.validarDatos()
    this.tieneFrecuenciasEsperadas()

    document.addEventListener("DOMContentLoaded", () => {
      const tabs = document.querySelectorAll<HTMLButtonElement>(".tab");
      const contents = document.querySelectorAll<HTMLElement>(".tab-content");

      tabs.forEach(tab => {
        tab.addEventListener("click", () => {
          const selectedIndex = parseInt(tab.dataset['tab'] || "0");

          tabs.forEach((t, i) => {
            t.classList.toggle("active", i === selectedIndex);
            contents[i].classList.toggle("active", i === selectedIndex);
          });
        });
      });
    });

  }

  mensajeTemporal: string = '';
  tooltipGenerationVisible: boolean = false;
  modalStrategyDetails: boolean = false;
  selectedOptionFreq: string = 'none';
  isNone: boolean = true;
  isRandom: boolean = false;
  isZeroTo2N: boolean = false;
  showCharts: boolean = false;
  notBuilt: boolean = true;
  templateSelected: boolean = false;
  generateClicked: boolean = false;

  override generateInitialPopulation() {
    this.running = true
    this.state = "Generating initial population!"
    this.error = undefined
    this.showCharts = true;
    this.generateClicked = true;

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
    console.log("Temp: ", this.manager.selectedTemplate)
    this.templateSelected = true;
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

    localStorage.setItem('selectedOptionFreqGenetic', this.selectedOptionFreq);
    this.tieneFrecuenciasEsperadas()
  }

  showChartsMethod() {
    if (this.showCharts) {
      this.showCharts = false;
    } else {
      this.showCharts = true;
    }
  }

  buildActions() {
    this.notBuilt = false;

    const tabs = document.querySelectorAll<HTMLButtonElement>(".tab");
    const contents = document.querySelectorAll<HTMLElement>(".tab-content");

    const selectedIndex = 1;

    tabs.forEach((t, i) => {
      t.classList.toggle("active", i === selectedIndex);
      contents[i].classList.toggle("active", i === selectedIndex);
    });

    this.tieneFrecuenciasEsperadas()
  }

  validarDatos(): boolean {
    const config = this.pc.inputConfiguration;

    if (!this.templateSelected) return true;
    if (!config) return true;

    if (config.qubits == null || config.qubits < 1 || config.qubits > 24) return true;

    if (
      config.minNumberOfColumns == null || config.minNumberOfColumns < 4 ||
      config.maxNumberOfColumns == null || config.maxNumberOfColumns < 4
    ) return true;

    if (
      config.populationSize == null || config.populationSize < 2 || config.populationSize % 2 !== 0 ||
      config.maxPopulationSize == null || config.maxPopulationSize < 2 || config.maxPopulationSize % 2 !== 0
    ) return true;

    if (this.pc.desiredError == null || this.pc.desiredError < 0) return true;

    const hayPuertaSeleccionada = this.gates.some(g => g.selected);
    if (!hayPuertaSeleccionada) return true;

    const hayOutputSeleccionado = config.outputs?.some(o => o === true);
    if (!hayOutputSeleccionado) return true;

    const porcentajes = [
      this.pc.probOf1QubitGates,
      this.pc.probOf2QubitGates,
      this.pc.probOf3QubitGates,
      this.pc.probOfNQubitGates
    ];
    if (porcentajes.some(p => p == null || p < 0 || p > 100)) return true;

    return false;
  }

  tieneFrecuenciasEsperadas(): boolean {
    console.log("Freq esperadas: ", this.pc.inputConfiguration.expectedFrequencies.some(freq => freq !== 0))
    return this.pc.inputConfiguration.expectedFrequencies.some(freq => freq !== 0);
  }

  reload() {
    location.reload();
  }

  animateMoveUp(index: number) {
    if (index <= 0) return;

    const cardsArray = this.cardElems.toArray();
    const element = cardsArray[index].nativeElement;

    element.classList.add('move-up');

    setTimeout(() => {
      element.classList.remove('move-up');
      this.moveUp(index);
    }, 300);
  }

  animateMoveDown(index: number) {
    if (index >= this.existingStrategies.length - 1) return;

    const cardsArray = this.cardElems.toArray();
    const element = cardsArray[index].nativeElement;

    element.classList.add('move-down');

    setTimeout(() => {
      element.classList.remove('move-down');
      this.moveDown(index);
    }, 300);
  }

}
