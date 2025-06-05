import { Component, HostListener } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Individual } from '../common/Individual';
import { EvolutionaryService } from '../evolutionary.service';
import { EvolutionaryComponent } from '../common/evolutionary.component';
import { ManagerService } from '../manager.service';
import { CodeTemplate } from '../templates/CodeTemplate';
import { NotificationService } from '../notification.service';
import { CanComponentDeactivate } from '../CanComponentDeactivate';



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

    window.addEventListener('beforeunload', this.confirmExit);

    this.notificationService.getMessages().subscribe(msg => {
      this.message = msg;
      //console.log("Mensaje SSE:", msg);
    });

    this.templateSelected = localStorage.getItem('templateSelected') === 'true' || false;
    if (this.templateSelected) {
      const savedTemplate = localStorage.getItem('selectedTemplate');
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

    /*localStorage.removeItem('templateSelected');
    localStorage.removeItem('selectedTemplate');
    this.templateSelected = false;
    this.manager.selectedTemplate = new CodeTemplate("", "", "");*/

    this.pc.probOf1QubitGates = localStorage.getItem('probOf1QubitGates') ? JSON.parse(localStorage.getItem('probOf1QubitGates') || '50') : 50;
    this.pc.probOf2QubitGates = localStorage.getItem('probOf2QubitGates') ? JSON.parse(localStorage.getItem('probOf2QubitGates') || '50') : 50;
    this.pc.probOf3QubitGates = localStorage.getItem('probOf3QubitGates') ? JSON.parse(localStorage.getItem('probOf3QubitGates') || '20') : 20;
    this.pc.probOfNQubitGates = localStorage.getItem('probOfNQubitGates') ? JSON.parse(localStorage.getItem('probOfNQubitGates') || '20') : 20;

    this.updateOutputs();

    const savedConfig = localStorage.getItem('qucoConfiguration');
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

  canDeactivate(): boolean {
    if (this.running || !this.notBuilt) {
      return confirm('Are you sure you want to exit Genetic algorithm?');
    }
    return true;
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.confirmExit);
  }

  confirmExit = (event: BeforeUnloadEvent): void => {
    if (this.running || !this.notBuilt) {
      event.preventDefault();
      event.returnValue = '';
    }
  };

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
    console.log('Plantilla seleccionada:', this.manager.selectedTemplate);
    console.log('plantillas:', this.manager.templates);
    //console.log('Plantilla seleccionada:', this.manager.selectedTemplate);
    this.templateSelected = true;

    localStorage.setItem('templateSelected', JSON.stringify(this.templateSelected));
    localStorage.setItem('selectedTemplate', JSON.stringify(this.manager.selectedTemplate));
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

    localStorage.setItem('templateSelected', JSON.stringify(this.templateSelected));
    localStorage.setItem('selectedTemplate', JSON.stringify(this.manager.selectedTemplate));
    localStorage.setItem('probOf1QubitGates', JSON.stringify(this.pc.probOf1QubitGates));
    localStorage.setItem('probOf2QubitGates', JSON.stringify(this.pc.probOf2QubitGates));
    localStorage.setItem('probOf3QubitGates', JSON.stringify(this.pc.probOf3QubitGates));
    localStorage.setItem('probOfNQubitGates', JSON.stringify(this.pc.probOfNQubitGates));

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
    //localStorage.removeItem('qucoConfiguration');
    //localStorage.removeItem('selectedOptionFreqGenetic');
    //localStorage.removeItem('templateSelected');
    //localStorage.removeItem('selectedTemplate');
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
