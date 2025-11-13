import { Component } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Individual } from '../common/Individual';
import { BlocksService } from './blocks.service';
import { EvolutionaryComponent } from '../common/evolutionary.component';
import { Gate } from '../common/Gate';
import { ManagerService } from '../manager.service';
import { CodeTemplate } from '../templates/CodeTemplate';
import { NotificationService } from '../notification.service';
import { BlockCircuit } from './BlockCircuit';
import { Backend } from '../deterministic/Backend';
import { TranspileService } from '../transpile.service';
import { BlockColumn } from './BlockColumn';
import { min } from 'rxjs';
import { ProjectService } from '../project.service';

interface QProgramExpression { name: string; expr: string; description: string; type: string; }
interface QProgram { id: string; qubits: number; expressions: QProgramExpression[]; shots: number; generator: any; qcodes: { platform: string, code: string }[]; inputQubits: string; outputQubits: string; qCircuit: any; }
interface ProjectListItem { id: string; name: string; type: string; }
interface StoredProject { id: string; name: string; qProgram: any; }
interface FinalPayload { circuit: any; user: { id: string }; }

Chart.register(...registerables)

@Component({
  selector: 'app-blocks',
  templateUrl: './blocks.component.html',
  styleUrls: ['./blocks.component.css']
})
export class BlocksComponent extends EvolutionaryComponent {

  message: string | null = null;
  mensajeTemporal: string = '';
  mensajeTemporal2: string = '';
  notBuilt: boolean = true;
  templateSelected: boolean = false;
  generateClicked: boolean = false;
  modalStrategyDetails: boolean = false;
  showCharts: boolean = false;
  isNone: boolean = true;
  isRandom: boolean = false;
  isZeroTo2N: boolean = false;
  selectedOptionFreq: string = 'none';
  selectedGate: String = 'H';

  modalTranspile: boolean = false;
  transpiledCode: string = '';
  availableBackends: Backend[] = [];
  selectedBackends: Backend[] = [];
  circuitName: string = '';
  availableGates: string[] = ['X', 'RX', 'RZ', 'Identity', 'RY', 'Z', 'H', 'S', 'Y', 'P', 'T', 'U', 'TDG', 'SDG'];
  startingColumns : BlockColumn[] = [];
  mostrarInstEjecucion = false;
  mostrarEjecucionRemote = false;

  projectList: ProjectListItem[] = []; 
  selectedProjectId: string = '';

  mostrarModalGuardarProyecto: boolean = false;
  saveError: string = '';
  
  userEmail: string = localStorage.getItem('userEmail') || '';
  userToken: string = localStorage.getItem('userToken') || '';

  GENETIC_GENERATOR_FQCN = 'edu.uclm.reper.model.Genetic'; 
  REQUIRED_GENERATOR_TYPE = this.GENETIC_GENERATOR_FQCN;

  responseReceived? : any


  constructor(private blocksService : BlocksService, public manager : ManagerService, private notificationService: NotificationService,
    public transpileService: TranspileService, private projectService: ProjectService) {
    super(blocksService, "blocks")
    this.pc.inputConfiguration.minNumberOfColumns = 1
    this.pc.inputConfiguration.maxNumberOfColumns = 4
  }

  ngAfterViewInit(): void {
    this.tieneFrecuenciasEsperadas()
    const tabs = document.querySelectorAll<HTMLButtonElement>(".tab");
    const contents = document.querySelectorAll<HTMLElement>(".tab-content");

    this.pc.inputConfiguration.minNumberOfColumns = 1;
    this.pc.inputConfiguration.maxNumberOfColumns = 4;

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
    localStorage.removeItem('qucoConfigurationBlocks');
    localStorage.removeItem('qucoConfiguration');
    localStorage.removeItem('blocksQubits');

    this.notificationService.getMessages().subscribe(msg => {
      this.message = msg;
    });

    //this.pc.inputConfiguration.blockCircuit = localStorage.getItem('qucoConfigurationBlocks') ? JSON.parse(localStorage.getItem('qucoConfigurationBlocks') || '{}') : new BlockCircuit(this.pc.inputConfiguration.qubits);

    this.pc.inputConfiguration.minNumberOfColumns = 1;
    this.pc.inputConfiguration.maxNumberOfColumns = 4;


    this.pc.inputConfiguration.qubits = localStorage.getItem('blocksQubits') ? JSON.parse(localStorage.getItem('blocksQubits') || '5') : 5;

    this.transpileService.getBackends().subscribe(backends => {
      this.availableBackends = backends;
    });

    for (let i = 0; i < this.pc.inputConfiguration.blockCircuit.startingColumns.length; i++) {
      for (let j = 0; j < this.pc.inputConfiguration.qubits; j++) {
        if (!this.pc.inputConfiguration.blockCircuit.startingColumns[i].gates[j]) {
          this.pc.inputConfiguration.blockCircuit.startingColumns[i].gates[j] = new Gate("H", false, 1);
        }
      }
    }


    this.selectedBackends = JSON.parse(localStorage.getItem('selectedBackends') || '[]');
    this.availableBackends = JSON.parse(localStorage.getItem('availableBackends') || '[]');

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
          console.log('Plantilla seleccionada:', this.manager.selectedTemplate);
        } catch (error) {
          console.error('Error al parsear plantilla desde localStorage:', error);
        }
      } else {
        console.log('No hay plantilla guardada en localStorage');
        this.templateSelected = false;
        this.validarDatos();
      }
    } else {
      console.log('No hay plantilla seleccionada');
    }

    localStorage.setItem('isBlocks', "true");
    localStorage.setItem('isGenetic', "false");

  }

  updateNumberOfQubits() {
    let qubits = parseInt((document.getElementById("numberOfQubits") as HTMLInputElement).value)
    localStorage.setItem('blocksQubits', JSON.stringify(qubits));
    // this.pc.inputConfiguration.blockCircuit.updateNumberOfQubits(qubits);
    this.pc.inputConfiguration.qubits = qubits
    this.pc.inputConfiguration.blockCircuit.updateNumberOfQubits(qubits);
    localStorage.setItem('qucoConfigurationBlocks', JSON.stringify(this.pc.inputConfiguration.blockCircuit));
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
    console.log("Setting gate", gate, "for qubit", qubitIndex, "in column", columnIndex)
    if (gate) 
      //this.pc.inputConfiguration.blockCircuit.setStartGate(qubitIndex, columnIndex, gate)
      this.pc.inputConfiguration.blockCircuit.startingColumns[columnIndex].gates[qubitIndex] = gate

    localStorage.setItem('qucoConfigurationBlocks', JSON.stringify(this.pc.inputConfiguration.blockCircuit));
  }

  setBlockGate(side : string, columnIndex : number, qubitIndex : number, e : any) {
    let gate = this.findGate(e)
    console.log("Setting gate", gate, "for qubit", qubitIndex, "in column", columnIndex)
    if (gate) {
      if (side=="left")
        this.pc.inputConfiguration.blockCircuit.block.leftColumns[columnIndex].gates[qubitIndex] = gate
      else
        this.pc.inputConfiguration.blockCircuit.block.rightColumns[columnIndex].gates[qubitIndex] = gate
    }

    localStorage.setItem('qucoConfigurationBlocks', JSON.stringify(this.pc.inputConfiguration.blockCircuit));
  }

  updateNumberOfBlocks() {
    this.pc.inputConfiguration.blockCircuit.updateNumberOfBlocks(this.pc.inputConfiguration.outputs.filter(output => output).length)

    localStorage.setItem('qucoConfigurationBlocks', JSON.stringify(this.pc.inputConfiguration.blockCircuit));
  }

  override generateInitialPopulation() {
    this.running = true
    this.generateClicked = true
    this.state = "Generating initial population!"
    this.error = undefined
    this.showCharts = true;

    if (this.selectedRemoteFitnessers.length==0 ) {
      this.error = "You must select one fitnesser at least"
    } else {
      this.prepareCharts()
      // this.service.generateInitialPopulation(this.pc, this.gates.filter(g => g.selected), this.manager.selectedTemplate).subscribe(
      this.pc.gateNames = []
      let selectedGates = this.gates.filter(g => g.selected)
      for (let i = 0; i < selectedGates.length; i++)
        this.pc.gateNames.push(selectedGates[i].name!)
      this.pc.codeTemplate = this.manager.selectedTemplate
      this.service.generateInitialPopulation(this.pc).subscribe(
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
            // this.individuals.push(new Individual(i, this.getNumberOfSelectedFitnessers()))
            this.individuals.push(new Individual(i))
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
    localStorage.setItem('qucoConfigurationBlocks', JSON.stringify(this.pc.inputConfiguration.blockCircuit));

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

    if (this.validarInputPopSizeInit()) return true;
    if (this.validarInputPopSizeMax()) return true;
    if (this.validarInputError()) return true;
    if (this.validarDatosInputThreshold()) return true;
    if (this.validarDatosInputFitnessPercentage()) return true;
    if (this.validarStartingColumns()) return true;
    if (this.validarProbabilities()) return true;

    //if (!this.validarGates()) return true;

    
    return false;
  }

  validarGates(): boolean {
      return this.gates.some(g => g.affectedQubits === 1 && g.selected)
        && this.gates.some(g => g.affectedQubits === 2 && g.selected)
        && this.gates.some(g => g.affectedQubits === 3 && g.selected)
        && this.gates.some(g => g.affectedQubits >= 4 && g.selected);
  }

  validarInputPopSize() : boolean {
    const config = this.pc.inputConfiguration;
    if (config.populationSize == null || config.populationSize < 2 || config.populationSize % 2 !== 0) return true;
    if (config.maxPopulationSize == null || config.maxPopulationSize < 2 || config.maxPopulationSize % 2 !== 0) return true;
    if (config.populationSize > config.maxPopulationSize) return true;
    return false;
  }

  validarStartingColumns() : boolean {
    const config = this.pc.inputConfiguration;
    /*if (config.minNumberOfColumns == null || config.minNumberOfColumns < 1 || config.minNumberOfColumns > 10) return true;
    if (config.maxNumberOfColumns == null || config.maxNumberOfColumns < 1 || config.maxNumberOfColumns > 10) return true;*/
    if (config.minNumberOfColumns == null || config.minNumberOfColumns < 1 || config.minNumberOfColumns > config.maxNumberOfColumns) return true;
    if (config.maxNumberOfColumns == null || config.maxNumberOfColumns < 1 || config.maxNumberOfColumns < config.minNumberOfColumns) return true;
    if (config.minNumberOfColumns > config.maxNumberOfColumns) return true;
    return false;
  }

  validarProbabilities() : boolean {
    const config = this.pc;
    if (config.probOf1QubitGates == null || config.probOf1QubitGates < 0 || config.probOf1QubitGates > 100) return true;
    if (config.probOf2QubitGates == null || config.probOf2QubitGates < 0 || config.probOf2QubitGates > 100) return true;
    if (config.probOf3QubitGates == null || config.probOf3QubitGates < 0 || config.probOf3QubitGates > 100) return true;
    if (config.probOfNQubitGates == null || config.probOfNQubitGates < 0 || config.probOfNQubitGates > 100) return true;
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
    localStorage.removeItem('qucoConfigurationBlocks');
    localStorage.removeItem('qucoConfiguration');
    localStorage.removeItem('blocksQubits');
    location.reload();
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

  onOptionFreqChange(value: string): void {
    
    this.isNone = value === 'none';
    this.isRandom = value === 'random';
    this.isZeroTo2N = value === 'zeroTo2N';
  }

  copiarCodigo() {
    
    const codigo = this.code?.toString() || '';
    
    navigator.clipboard.writeText(codigo).then(() => {
      console.log('Código copiado al portapapeles');
      this.mensajeTemporal2 = 'Code copied';
      setTimeout(() => {
        this.mensajeTemporal2 = '';
      }, 1000);
    }).catch(err => {
      console.error('Error al copiar el código:', err);
    });
  }

  copiarCodigo2() {

    setTimeout(() => {
      const codigo = this.code?.toString() || '';
    
      navigator.clipboard.writeText(codigo).then(() => {
        console.log('Código copiado al portapapeles');
        this.mensajeTemporal2 = 'Code copied';
        setTimeout(() => {
            this.mensajeTemporal2 = '';
        }, 1000);
      }).catch(err => {
        console.error('Error al copiar el código:', err);
      });
    }, 1000);
  }

  transpileCodigo() {
    this.modalTranspile = true;
  }
  
  selectBackend(backend: Backend) {
    this.selectedBackends.push(backend);
    this.availableBackends = this.availableBackends.filter(b => b.name !== backend.name);
    localStorage.setItem('selectedBackends', JSON.stringify(this.selectedBackends));
    localStorage.setItem('availableBackends', JSON.stringify(this.availableBackends));
  }
  
  deselectBackend(backend: Backend) {
    this.availableBackends.push(backend);
    this.selectedBackends = this.selectedBackends.filter(b => b.name !== backend.name);
    localStorage.setItem('selectedBackends', JSON.stringify(this.selectedBackends));
    localStorage.setItem('availableBackends', JSON.stringify(this.availableBackends));
  }
  
  transpile() {
    try{
      const backendsToTranspile = this.selectedBackends.map(b => b.name);
      this.transpileService.transpile(this.code, backendsToTranspile, this.circuitName).subscribe(result => {
        this.transpiledCode = result;
      });
      this.mensajeTemporal = 'The code will be transpiled.';
      setTimeout(() => {
        this.mensajeTemporal = '';
      }
      , 2000);
    } catch (error) {
      console.error('Error during transpilation:', error);
      this.mensajeTemporal = 'Error during transpilation. Please try again.';
      setTimeout(() => {
        this.mensajeTemporal = '';
      }, 2000);
    }
  }

  deleteLocal() {
    localStorage.removeItem("qucoConfigurationBlocks");
    this.reload();
  }

  updateColumnsFromInput() {
    const blockCircuit = this.pc.inputConfiguration.blockCircuit;

    // Asegúrate de tener acceso a qubits y número de columnas deseado
    const qubits = blockCircuit.qubits;
    const targetColumns = blockCircuit.numberOfStartColumns;

    // Si hay menos columnas de las que se quiere, añade nuevas
    while (blockCircuit.startingColumns.length < targetColumns) {
      const index = blockCircuit.startingColumns.length;
      const newColumn = new BlockColumn(qubits);

      // Asigna puertas según la posición (opcionalmente puedes personalizar)
      if (index %2 === 0) newColumn.setGates(new Array(qubits).fill("X"));
      else if (index === 1) newColumn.setGates(new Array(qubits).fill("H"));
      else newColumn.setGates(new Array(qubits).fill("H"));

      blockCircuit.startingColumns.push(newColumn);
    }

    // Si hay más columnas de las que se quiere, elimina del final
    while (blockCircuit.startingColumns.length > targetColumns) {
      blockCircuit.startingColumns.pop();
    }

    // Guarda en localStorage (opcional)
    localStorage.setItem('qucoConfigurationBlocks', JSON.stringify(blockCircuit));
  }

  updateColumnsFromInputLeft(side: string) {
    const blockCircuit = this.pc.inputConfiguration.blockCircuit;
    let originalLength
    console.log("Updating left columns from input")
    originalLength = blockCircuit.block.numberOfLeftColumns
    if (blockCircuit.block.numberOfLeftColumns>blockCircuit.block.leftColumns.length)
      blockCircuit.block.leftColumns.push(new BlockColumn(blockCircuit.qubits, originalLength))
    else
      blockCircuit.block.leftColumns.splice(blockCircuit.block.leftColumns.length-1, 1)

    localStorage.setItem('qucoConfigurationBlocks', JSON.stringify(blockCircuit));
        
  }

  updateColumnsFromInputRight(side: string) {
    const blockCircuit = this.pc.inputConfiguration.blockCircuit;
    let originalLength
    console.log("Updating right columns from input")
    originalLength = blockCircuit.block.numberOfRightColumns
    if (blockCircuit.block.numberOfRightColumns>blockCircuit.block.rightColumns.length)
      blockCircuit.block.rightColumns.push(new BlockColumn(blockCircuit.qubits, originalLength))
    else
      blockCircuit.block.rightColumns.splice(blockCircuit.block.rightColumns.length-1, 1)
        
    localStorage.setItem('qucoConfigurationBlocks', JSON.stringify(blockCircuit));
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

  canDeactivate(): boolean {
    if (this.running || !this.notBuilt) {
      return confirm('Are you sure you want to exit Blocks genetic algorithm?');
    }
    return true;
  }

  toggleSelectGates(minQubits: number) {
    const allSelected = this.areAllSelected(minQubits);
    this.gates.forEach(g => {
      if (minQubits === 4) {
        if (g.affectedQubits >= minQubits) {
          g.selected = !allSelected;
        }
      } else if (g.affectedQubits === minQubits) {
        g.selected = !allSelected;
      } else if (minQubits === 5 && g.affectedQubits >= 1) {
        g.selected = !allSelected;
      }
    });
    this.saveGates();
  }

  areAllSelected(minQubits: number): boolean {
    if (minQubits === 1) {
      return this.gates.filter(g => g.affectedQubits === 1).every(g => g.selected);
    } else if (minQubits === 2) {
      return this.gates.filter(g => g.affectedQubits === 2).every(g => g.selected);
    } else if (minQubits === 3) {
      return this.gates.filter(g => g.affectedQubits === 3).every(g => g.selected);
    } else if (minQubits === 4) {
      return this.gates.filter(g => g.affectedQubits >= minQubits).every(g => g.selected);
    } else if (minQubits === 5) {
      return this.gates.filter(g => g.affectedQubits >= 1).every(g => g.selected);
    } else {
      return false;
    }
  }

  disableTyping(event: KeyboardEvent) {
    const allowedKeys = ['ArrowUp', 'ArrowDown', 'Tab', 'Backspace'];
    if (!allowedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }



}
