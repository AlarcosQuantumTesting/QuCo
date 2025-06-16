import { Component } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Individual } from '../common/Individual';
import { BlocksService } from './blocks.service';
import { EvolutionaryComponent } from '../common/evolutionary.component';
import { Gate } from '../common/Gate';
import { ManagerService } from '../manager.service';
import { CodeTemplate } from '../templates/CodeTemplate';
import { NotificationService } from '../notification.service';

Chart.register(...registerables)

@Component({
  selector: 'app-blocks',
  templateUrl: './blocks.component.html',
  styleUrls: ['./blocks.component.css']
})
export class BlocksComponent extends EvolutionaryComponent {

  message: string | null = null;
  mensajeTemporal: string = '';
  notBuilt: boolean = true;
  templateSelected: boolean = false;
  generateClicked: boolean = false;
  modalStrategyDetails: boolean = false;
  showCharts: boolean = false;
  isNone: boolean = true;
  isRandom: boolean = false;
  selectedOptionFreq: string = 'none';

  constructor(private blocksService : BlocksService, public manager : ManagerService, private notificationService: NotificationService) {
    super(blocksService, "blocks")
    this.pc.inputConfiguration.minNumberOfColumns = 1
    this.pc.inputConfiguration.maxNumberOfColumns = 3
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
    this.notificationService.getMessages().subscribe(msg => {
      this.message = msg;
      //console.log("Mensaje SSE:", msg);
    });


    this.templateSelected = localStorage.getItem('templateSelectedBlocks') === 'true' || false;
    if (this.templateSelected) {
      const savedTemplate = localStorage.getItem('selectedTemplateBlocks');
      if (savedTemplate) {
        try {
          const template = JSON.parse(savedTemplate);
          setTimeout(() => {
            this.onTemplateChange(template);
          }, 1000);
          console.log('Nombre:', template.fileName);
          this.manager.selectedTemplate = this.manager.templates.find(t => t.fileName === template.fileName) || new CodeTemplate("", "", "");
          //this.manager.selectedTemplate = new CodeTemplate(template.fileName, template.code, template.description);
          console.log('Plantilla seleccionada:', this.manager.selectedTemplate);
        } catch (error) {
          console.error('Error al parsear plantilla desde localStorage:', error);
        }
      } else {
        console.log('No hay plantilla guardada en localStorage');
      }
    } else {
      console.log('No hay plantilla seleccionada');
    }


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
    this.generateClicked = true
    this.state = "Generating initial population!"
    this.error = undefined

    if (this.selectedRemoteFitnessers.length==0 ) {
      this.error = "You must select one fitnesser at least"
    } else {
      this.prepareCharts()
      this.service.generateInitialPopulation(this.pc, this.gates.filter(g => g.selected), this.manager.selectedTemplate).subscribe(
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
          /*if (result.error?.message)
            this.error = result.error.message
          else
            this.error = result.message + " (is the server running?)"*/


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
    //console.log('Plantilla seleccionada:', this.manager.selectedTemplate);
    this.templateSelected = true;

    localStorage.setItem('templateSelectedBlocks', JSON.stringify(this.templateSelected));
    localStorage.setItem('selectedTemplateBlocks', JSON.stringify(this.manager.selectedTemplate));
  }


  buildActions() {
    this.notBuilt = false;

    localStorage.setItem('templateSelectedBlocks', JSON.stringify(this.templateSelected));
    localStorage.setItem('selectedTemplateBlocks', JSON.stringify(this.manager.selectedTemplate));
    localStorage.setItem('probOf1QubitGatesBlocks', JSON.stringify(this.pc.probOf1QubitGates));
    localStorage.setItem('probOf2QubitGatesBlocks', JSON.stringify(this.pc.probOf2QubitGates));
    localStorage.setItem('probOf3QubitGatesBlocks', JSON.stringify(this.pc.probOf3QubitGates));
    localStorage.setItem('probOfNQubitGatesBlocks', JSON.stringify(this.pc.probOfNQubitGates));

    this.updateOutputs();
    this.resetMatrix();

    const tabs = document.querySelectorAll<HTMLButtonElement>(".tab");
    const contents = document.querySelectorAll<HTMLElement>(".tab-content");

    const selectedIndex = 1;

    tabs.forEach((t, i) => {
      t.classList.toggle("active", i === selectedIndex);
      contents[i].classList.toggle("active", i === selectedIndex);
    });
    this.tieneFrecuenciasEsperadas();
  }

  tieneFrecuenciasEsperadas(): boolean {
    return this.pc.inputConfiguration.expectedFrequencies.some(freq => freq !== 0);
  }

  validarDatos(): boolean {
    const config = this.pc.inputConfiguration;

    if (!this.templateSelected) return true;
    if (!config) return true;

    if (config.qubits == null || config.qubits < 1 || config.qubits > 24) return true;

    if (
      config.minNumberOfColumns == null || config.minNumberOfColumns < 1 ||
      config.maxNumberOfColumns == null || config.maxNumberOfColumns < 1
    ) return true;

    if (this.pc.massiveMutationPolicy.fallsThreshold < 0) return true;
    

    if (this.pc.massiveMutationPolicy.fitnessPercentage < 0) return true;

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

  validarInputPopSizeInit() : boolean {
    const config = this.pc.inputConfiguration;
    if (config.populationSize == null || config.populationSize < 2 || config.populationSize % 2 !== 0) return true;
    return false;
  }

  validarInputPopSizeMax() : boolean {
    const config = this.pc.inputConfiguration;
    if (config.maxPopulationSize == null || config.maxPopulationSize < 2 || config.maxPopulationSize % 2 !== 0) return true;
    return false;
  }

  validarInputError() : boolean {
    const config = this.pc.inputConfiguration;
    if (this.pc.desiredError == null || this.pc.desiredError < 0) return true;
    return false;
  }

  validarDatosInputThreshold() : boolean {
    if (this.pc.massiveMutationPolicy.fallsThreshold < 0) return true;
    return false;
  }

  validarDatosInputFitnessPercentage() : boolean {
    if (this.pc.massiveMutationPolicy.fitnessPercentage < 0) return true;
    return false;
  }

  showChartsMethod() {
    if (this.showCharts) {
      this.showCharts = false;
    } else {
      this.showCharts = true;
    }
  }

  hasNonZeroFrequencies(): boolean {
    const frequencies = this.pc.inputConfiguration!.expectedFrequencies;
    for (let i = 0; i < frequencies.length; i++) {
      if (frequencies[i] !== 0) {
        return true;
      }
    }
    return false;
  }

  reload() {
    location.reload();
  }

  applyOption() {
    if (this.isNone) {
      this.resetMatrix();
    } else if (this.isRandom) {
      this.random();
    }

    localStorage.setItem('selectedOptionFreqGenetic', this.selectedOptionFreq);
    this.tieneFrecuenciasEsperadas()
  }

  onOptionFreqChange(value: string): void {
    
    this.isNone = value === 'none';
    this.isRandom = value === 'random';
  }

}
