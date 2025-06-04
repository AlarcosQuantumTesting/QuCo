import { Component, HostListener } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Individual } from '../common/Individual';
import { EvolutionaryService } from '../evolutionary.service';
import { EvolutionaryComponent } from '../common/evolutionary.component';
import { ManagerService } from '../manager.service';
import { CodeTemplate } from '../templates/CodeTemplate';
import { NotificationService } from '../notification.service';


Chart.register(...registerables)

@Component({
  selector: 'app-elonging',
  templateUrl: './elonging.component.html',
  styleUrls: ['./elonging.component.css']
})
export class ElongingComponent extends EvolutionaryComponent {

  message: string | null = null;

  constructor(private evolutionaryService : EvolutionaryService, public manager : ManagerService, private notificationService: NotificationService) {
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

    this.notificationService.getMessages().subscribe(msg => {
      this.message = msg;
      console.log("Mensaje SSE:", msg);
    });

    this.updateOutputs();

    const savedConfig = localStorage.getItem('qucoConfiguration');
    if (savedConfig) {
      try {
        const conf = JSON.parse(savedConfig);
        const config = this.pc.inputConfiguration;

        config.qubits = conf.qubits;
        console.log('Configuración qubit:', config.qubits);
        config.populationSize = conf.populationSize;
        console.log('Configuración populationSize:', config.populationSize);
        config.maxPopulationSize = conf.maxPopulationSize;
        console.log('Configuración maxPopulationSize:', config.maxPopulationSize);
        config.minNumberOfColumns = conf.minNumberOfColumns;
        console.log('Configuración minNumberOfColumns:', config.minNumberOfColumns);
        config.maxNumberOfColumns = conf.maxNumberOfColumns;
        console.log('Configuración maxNumberOfColumns:', config.maxNumberOfColumns);
        config.deleteFiles = conf.deleteFiles;
        console.log('Configuración deleteFiles:', config.deleteFiles);
        config.shots = conf.shots;
        console.log('Configuración shots:', config.shots);
        config.outputs = conf.outputs;
        console.log('Configuración outputs:', config.outputs);
        config.expectedFrequencies = conf.expectedFrequencies;
        console.log('Configuración expectedFrequencies:', config.expectedFrequencies);
        config.startWithH = conf.startWithH;
        console.log('Configuración startWithH:', config.startWithH);


        if (conf.blockCircuit) {
          config.blockCircuit = { ...conf.blockCircuit };
        }

      } catch (error) {
        console.error('Error al parsear configuración desde localStorage:', error);
      }
    }


    /*const qucoConfiguracion = localStorage.getItem('qucoConfiguracion');

    const configuracion = JSON.parse(qucoConfiguracion || '{}');

    if(qucoConfiguracion) {
      const configuracion = JSON.parse(qucoConfiguracion);
      this.pc.inputConfiguration = configuracion;
      this.pc.inputConfiguration.expectedFrequencies = configuracion.expectedFrequencies || [];
      this.pc.inputConfiguration.outputs = configuracion.outputs || [];
    }*/

    
    
    if(!savedConfig) {
      console.log('No hay configuración guardada en localStorage');
    }
    

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
  //qucoConfiguration: any;
  

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

      /*if (this.evolutionaryService.ws==undefined || this.evolutionaryService.ws.readyState==WebSocket.CLOSED)
        this.evolutionaryService.connectWS()*/

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

  validarDatosInputMin() : boolean {
    const config = this.pc.inputConfiguration;
    if (config.minNumberOfColumns == null || config.minNumberOfColumns < 4) return true;
    return false;
  }

  validarDatosInputMax() : boolean {
    const config = this.pc.inputConfiguration;
    if (config.maxNumberOfColumns == null || config.maxNumberOfColumns < 4) return true;
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

  tieneFrecuenciasEsperadas(): boolean {
    return this.pc.inputConfiguration.expectedFrequencies.some(freq => freq !== 0);
  }

  reload() {
    localStorage.removeItem('qucoConfiguration');
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

  hasNonZeroFrequencies(): boolean {
    const frequencies = this.pc.inputConfiguration!.expectedFrequencies;
    for (let i = 0; i < frequencies.length; i++) {
      if (frequencies[i] !== 0) {
        return true;
      }
    }
    return false;
  }

  copiarCodigo() {
    const codigo = this.code?.toString() || '';
    navigator.clipboard.writeText(codigo).then(() => {
      console.log('Código copiado al portapapeles');
      alert('Code copied to clipboard');
    }).catch(err => {
      console.error('Error al copiar el código:', err);
    });
  }


}
