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
import { Block } from './Block';

interface QProgramExpression { name: string; expr: string; description: string; type: string; }
interface QProgram { id: string; qubits: number; expressions: QProgramExpression[]; shots: number; generator: any; qcodes: { platform: string, code: string }[]; inputQubits: string; outputQubits: string; qCircuit: any; }
interface ProjectListItem { id: string; name: string; type: string; }
interface StoredProject { id: string; name: string; qProgram: any; projectNotes?: any[]; }
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

  BLOCKS_GENERATOR_FQCN = 'edu.uclm.reper.model.Blocks'; 
  REQUIRED_GENERATOR_TYPE = this.BLOCKS_GENERATOR_FQCN;

  responseReceived? : any
  mostrarNotasModal: boolean = false;
  nombreComponente: string = 'Blocks';
  tipoLocal: string = 'quco_blocks';
  storedNotesStr = localStorage.getItem('project_notes');

  isCircuitModified: boolean = false;
  private lastSavedCircuitState: string = '';

  showDeleteProjectModal: boolean = false;
  showApplyChangesModal: boolean = false;
  applyChanges: boolean = false;


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

    const savedProjectId = localStorage.getItem('selectedProjectId_blocks');
    if (savedProjectId && this.userEmail && this.userToken) {
        this.selectedProjectId = savedProjectId;
        this.onProjectSelected();
    }

    this.loadProjectNames();

  }

  updateNumberOfQubits() {
    let qubits = parseInt((document.getElementById("numberOfQubits") as HTMLInputElement).value)
    localStorage.setItem('blocksQubits', JSON.stringify(qubits));
    // this.pc.inputConfiguration.blockCircuit.updateNumberOfQubits(qubits);
    this.pc.inputConfiguration.qubits = qubits
    this.pc.inputConfiguration.blockCircuit.updateNumberOfQubits(qubits);
    localStorage.setItem('qucoConfigurationBlocks', JSON.stringify(this.pc.inputConfiguration.blockCircuit));

    this.saveState();
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
    this.saveState();
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
    this.saveState();
  }

  updateNumberOfBlocks() {
    this.pc.inputConfiguration.blockCircuit.updateNumberOfBlocks(this.pc.inputConfiguration.outputs.filter(output => output).length)

    localStorage.setItem('qucoConfigurationBlocks', JSON.stringify(this.pc.inputConfiguration.blockCircuit));
    this.saveState();
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
    this.saveState();
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
    this.saveState();
        
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
    this.saveState();
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



  /*private mapColumnsToStrings(columns: BlockColumn[]): string[][] {
    return columns.map(col => col.gates.map(g => g.name || "I"));
  }*/

  private mapColumnsToStrings(columns: BlockColumn[]): string[][] {
    if (!columns) return [];
    return columns.map(col => col.gates.map(g => g.name || "I"));
  }

  private mapStringsToColumns(rawData: string[][], qubits: number): BlockColumn[] {
    const columns: BlockColumn[] = [];
    if (!rawData) return columns;

    for (const colData of rawData) {
        const newCol = new BlockColumn(qubits);
        for (let i = 0; i < qubits; i++) {
            if (colData[i]) {
                newCol.gates[i] = new Gate(colData[i], true, 1);
            } else {
                newCol.gates[i] = new Gate("I", false, 1);
            }
        }
        columns.push(newCol);
    }
    return columns;
  }

  getGeneratorData(): any {
    const config = this.pc.inputConfiguration;
    const selectedGateNames = this.gates
        .filter(g => g.selected)
        .map(g => g.name);
    
    const bc = config.blockCircuit;

    const blockCircuitPayload = {
        numberOfStartColumns: bc.numberOfStartColumns,
        numberOfBlocks: bc.numberOfBlocks,
        startingColumns: this.mapColumnsToStrings(bc.startingColumns),
        blocks: [
            {
                numberOfLeftColumns: bc.block.numberOfLeftColumns,
                numberOfRightColumns: bc.block.numberOfRightColumns,
                leftColumns: this.mapColumnsToStrings(bc.block.leftColumns),
                rightColumns: this.mapColumnsToStrings(bc.block.rightColumns)
            }
        ]
    };

    return {
        "type": "BLOCKS",
        "minNumberColumns": config.minNumberOfColumns,
        "maxNumberColumns": config.maxNumberOfColumns,
        "populationSize": config.populationSize,
        "desiredError": this.pc.desiredError,
        "fallsThreshold": this.pc.massiveMutationPolicy.fallsThreshold,
        "applicableWhenBestFitnessFalls": this.pc.massiveMutationPolicy.applicableWhenBestFitnessFalls,
        "applicableWhenMeanFitnessFalls": this.pc.massiveMutationPolicy.applicableWhenMeanFitnessFalls,
        "fitnessPercentage": this.pc.massiveMutationPolicy.fitnessPercentage,
        "maxConsecutiveApplications": this.pc.massiveMutationPolicy.maxConsecutiveApplications,
        "gates": selectedGateNames,

        "blockCircuit": blockCircuitPayload
    };
  }

  openSaveProjectModal(): void {
    this.saveError = '';
    this.mostrarModalGuardarProyecto = true;
  }

  cancelarSaveModal(): void {
      this.mostrarModalGuardarProyecto = false;
      this.saveError = '';
      this.circuitName = ''; 
  }

  confirmarGuardarProyecto(): void {
      if (!this.circuitName || this.circuitName.trim().length === 0) {
          this.saveError = "The project name is mandatory.";
          return;
      }
      this.mostrarModalGuardarProyecto = false;
      this.saveError = '';
      this.guardarProyecto();
  }

  guardarProyecto(): void {
    if (!this.circuitName || this.circuitName.trim().length === 0) return;

    let idCircuit: string;

    if (this.applyChanges) {
      idCircuit = this.selectedProjectId;
      this.applyChanges = false;
    } else {
      idCircuit = crypto.randomUUID();
    }
    
    
    const generatorData = this.getGeneratorData();
    const qProgramExpressions: QProgramExpression[] = [];

    const selectedOutputIndices = this.pc.inputConfiguration.outputs
        .map((isSelected, index) => isSelected ? index : -1)
        .filter(index => index !== -1);

    const qProgram: QProgram = {
      id: idCircuit,
      qubits: this.pc.inputConfiguration.qubits || 0,
      expressions: qProgramExpressions,
      shots: this.pc.inputConfiguration.shots,
      generator: generatorData,
      qcodes: [
          {
              platform: "AerSimulator",
              code: this.code || "No qiskit code generated."
          }
      ],
      inputQubits: Array.from({length: this.pc.inputConfiguration.qubits || 0}, (_, i) => i).join(','),
      outputQubits: selectedOutputIndices.join(','),
      qCircuit: {
          id: idCircuit,
          qbits: this.pc.inputConfiguration.qubits || 0,
          quirkCode: {cols: []} 
      }
    };

    let notesPayload: any[] = [];
    const allNotesSaved = localStorage.getItem('project_notes');
    
    if (allNotesSaved) {
        try {
            const allNotes = JSON.parse(allNotesSaved);
            
            notesPayload = allNotes
                .filter((n: any) => n.type.toLowerCase() === this.tipoLocal.toLowerCase())
                .map((n: any, index: number) => ({
                    //id: `note_${Date.now()}_${index}`,
                    id: crypto.randomUUID(),
                    title: n.title,
                    text: n.text,
                    type: n.type,
                    timestamp: n.timestamp
                }));
                
        } catch (e) {
            console.error("Error procesando las notas del localStorage", e);
        }
    }
    
    const projectDtoForMapping: any = {
        id: idCircuit,
        name: this.circuitName,
        qProgram: qProgram,
        userEmail: this.userEmail,
        mutantCycles: [], 
        testSuite: null,
        projectNotes: notesPayload
    };
    
    const finalPayload: FinalPayload = {
        circuit: projectDtoForMapping, 
        user: { id: this.userEmail } 
    };

    console.log('Objeto JSON a guardar (BLOCKS):', JSON.stringify(finalPayload, null, 2));
    
    this.projectService.saveProject(finalPayload).subscribe({
      next: () => {
        //alert('Project "' + this.circuitName + '" saved successfully!');
        this.selectedProjectId = idCircuit;
        this.lastSavedCircuitState = this.captureCircuitState();
        this.isCircuitModified = false;

        this.mensajeTemporal2 = `Project "${this.circuitName}" saved successfully!`;
        setTimeout(() => this.mensajeTemporal2 = '', 3000);
        this.loadProjectNames();
      },
      error: (error: any) => {
        console.error('Error saving project:', error);
        alert('Error saving project (Code 400). Check console.');
      }
    });
  }

  getAuthRequestBody(projectId?: string): any {
    const instanceId = window.crypto.randomUUID(); 
    const body: any = {
        email: this.userEmail,
        token: this.userToken,
        instanceId: instanceId
    };
    if (projectId) {
        body.projectId = projectId;
    }
    return body;
  }

  loadProjectNames(): void {
    if (this.userEmail && this.userToken) {
        const requestBody = this.getAuthRequestBody();

        this.projectService.getProjectsName(requestBody).subscribe({
            next: (data: ProjectListItem[]) => {
                this.projectList = data.filter(project => 
                    project.type === this.REQUIRED_GENERATOR_TYPE
                );
                console.log("Project names loaded (BLOCKS):", this.projectList);
            },
            error: (err) => {
                console.error('Error al cargar nombres de proyectos:', err);
                this.projectList = []; 
            }
        });
    }
  }

  onProjectSelected(): void {
    if (!this.selectedProjectId) return;

    const requestBody = this.getAuthRequestBody(this.selectedProjectId);

    this.projectService.getProject(requestBody).subscribe({
        next: (project: StoredProject) => {
             this.mensajeTemporal2 = `Loading project "${project.name}"...`;
             setTimeout(() => { this.mensajeTemporal2 = ''; }, 1000);

             setTimeout(() => {
                 this.loadProjectDataToComponent(project);
                 const tabs = document.querySelectorAll<HTMLButtonElement>(".tab");
                 const contents = document.querySelectorAll<HTMLElement>(".tab-content");
                 tabs.forEach((t, i) => t.classList.toggle("active", i === 0));
                 contents.forEach((c, i) => c.classList.toggle("active", i === 0));
             }, 1000);
        },
        error: (err) => {
            console.error('Error loading project:', err);
            alert('Error loading project details.');
        }
    });
  }

  loadProjectDataToComponent(project: StoredProject): void {
    if (!project.qProgram) return;

    this.selectedProjectId = project.id;
    this.circuitName = project.name; 
    
    localStorage.setItem('selectedProjectId_blocks', project.id);
    //localStorage.setItem('selectedProjectName_blocks', project.name);

    const qp = project.qProgram;
    const generator = qp.generator;
    const config = this.pc.inputConfiguration;
    
    this.circuitName = project.name; 

    config.qubits = qp.qubits;

    
    const outputQubitsString = qp.outputQubits ? qp.outputQubits.toString() : '';
    const outputIndices: number[] = outputQubitsString 
        .split(',')
        .map((s: string) => parseInt(s.trim(), 10))
        .filter((n: number) => !isNaN(n));
    
    config.outputs = Array(qp.qubits).fill(false);
    outputIndices.forEach(i => {
        if (i >= 0 && i < qp.qubits) config.outputs[i] = true;
    });

    /*if (project.projectNotes && Array.isArray(project.projectNotes)) {
      const notesForStorage = project.projectNotes.map((n: any) => ({
        title: n.title,
        text: n.text,
        type: n.type,
        timestamp: n.timestamp
      }));

      localStorage.setItem('project_notes', JSON.stringify(notesForStorage));
      console.log(`Loaded ${notesForStorage.length} notes from project.`);
      console.log("Notes content:", notesForStorage);
    } else {
      // localStorage.removeItem('project_notes');
    }*/

    const incomingNotes = project.projectNotes || project.projectNotes;

    if (incomingNotes && Array.isArray(incomingNotes)) {
        
        const newNotes = incomingNotes.map((n: any) => ({
            title: n.title,
            text: n.text,
            type: n.type,
            timestamp: n.timestamp
        }));

        const storedNotesStr = localStorage.getItem('project_notes');
        let existingNotes: any[] = [];
        
        if (storedNotesStr) {
            try {
                existingNotes = JSON.parse(storedNotesStr);
            } catch (e) {
                console.error("Error parsing existing notes", e);
                existingNotes = [];
            }
        }

        const notesToKeep = existingNotes.filter((n: any) => 
            (n.type || '').toLowerCase() !== this.tipoLocal.toLowerCase()
        );

        const finalNotesList = [...notesToKeep, ...newNotes];

        localStorage.setItem('project_notes', JSON.stringify(finalNotesList));
        
        console.log(`Notes updated. Total: ${finalNotesList.length}. Loaded ${newNotes.length} for ${this.tipoLocal}.`);

    } else {
        
        /* const storedNotesStr = localStorage.getItem('project_notes');
        if (storedNotesStr) {
            const existingNotes = JSON.parse(storedNotesStr);
            const notesToKeep = existingNotes.filter((n: any) => 
                (n.type || '').toLowerCase() !== this.tipoLocal.toLowerCase()
            );
            localStorage.setItem('project_notes', JSON.stringify(notesToKeep));
        }
        */
    }
    
    if (generator.type === 'BLOCKS') {
        config.minNumberOfColumns = generator.minNumberColumns;
        config.maxNumberOfColumns = generator.maxNumberColumns;
        config.populationSize = generator.populationSize;
        this.pc.desiredError = generator.desiredError;
        
        this.pc.massiveMutationPolicy.fallsThreshold = generator.fallsThreshold;
        this.pc.massiveMutationPolicy.applicableWhenBestFitnessFalls = generator.applicableWhenBestFitnessFalls;
        this.pc.massiveMutationPolicy.applicableWhenMeanFitnessFalls = generator.applicableWhenMeanFitnessFalls;
        this.pc.massiveMutationPolicy.fitnessPercentage = generator.fitnessPercentage;
        this.pc.massiveMutationPolicy.maxConsecutiveApplications = generator.maxConsecutiveApplications;

        const savedGates: string[] = generator.gates || [];
        this.gates.forEach(g => { g.selected = savedGates.includes(g.name!); });
        this.saveGates();

        if (generator.blockCircuit) {
            const bcData = generator.blockCircuit;
            const qubits = config.qubits;

            const newBlockCircuit = new BlockCircuit(qubits);
            newBlockCircuit.numberOfStartColumns = bcData.numberOfStartColumns;
            newBlockCircuit.numberOfBlocks = bcData.numberOfBlocks;

            //newBlockCircuit.startingColumns = this.mapStringsToColumns(bcData.startingColumns, qubits);

            if (bcData.startingColumns) {
              newBlockCircuit.startingColumns = this.mapStringsToColumns(bcData.startingColumns, qubits);
            }

            //if (bcData.blocks && Array.isArray(bcData.blocks) && bcData.blocks.length > 0) {
            if (bcData.blocks && Array.isArray(bcData.blocks) && bcData.blocks.length > 0) {
                
                const blockData = bcData.blocks[0];
                
                if (blockData) {
                    console.log("Loading Block Data:", blockData);

                    const newBlock = new Block(qubits);
                    
                    newBlock.numberOfLeftColumns = blockData.numberOfLeftColumns || 0;
                    newBlock.numberOfRightColumns = blockData.numberOfRightColumns || 0;
                    
                    if (blockData.leftColumns) {
                        newBlock.leftColumns = this.mapStringsToColumns(blockData.leftColumns, qubits);
                    } else {
                        newBlock.leftColumns = []; 
                    }

                    if (blockData.rightColumns) {
                        newBlock.rightColumns = this.mapStringsToColumns(blockData.rightColumns, qubits);
                    } else {
                        newBlock.rightColumns = []; 
                    }

                    newBlockCircuit.block = newBlock;
                } else {
                    console.warn("Block data at index 0 is undefined or null.");
                }

            } else {
                console.warn("No 'blocks' array found or it is empty in blockCircuit data. Creating default block.");
                const defaultBlock = new Block(qubits);
                newBlockCircuit.block = defaultBlock;
            }
            this.pc.inputConfiguration.blockCircuit = newBlockCircuit;
        }
    }

    this.updateExpectedFrequencies();
    this.validarDatos(); 
    this.notBuilt = false;

    this.lastSavedCircuitState = ''; 
    this.isCircuitModified = false;
    
    //this.mensajeTemporal2 = `Project "${project.name}" loaded successfully.`;
    setTimeout(() => {

        this.updateExpectedFrequencies();

        this.lastSavedCircuitState = this.captureCircuitState(); 
        this.isCircuitModified = false;
        
        
        this.validarDatos(); 
        this.notBuilt = false;
        
        this.mensajeTemporal2 = `Project "${project.name}" loaded successfully.`;
        setTimeout(() => { this.mensajeTemporal2 = ''; }, 2000);
    }, 200);
    //setTimeout(() => { this.mensajeTemporal2 = ''; }, 2000);
  }


  private captureNotesState(): string {
    const allNotesStr = localStorage.getItem('project_notes');
    if (!allNotesStr) return '[]';

    try {
        const allNotes = JSON.parse(allNotesStr);
        const editorNotes = allNotes
            .filter((n: any) => (n.type || '').toLowerCase() === this.tipoLocal.toLowerCase())
            .map((n: any) => ({
                title: n.title,
                text: n.text,
                type: n.type,
            }));
        editorNotes.sort((a: any, b: any) => (a.title + a.text).localeCompare(b.title + b.text));
        
        return JSON.stringify(editorNotes);
    } catch (e) {
        console.error("Error capturing notes state:", e);
        return '[]';
    }
  }

  private captureCircuitState(): string {
    const config = this.pc.inputConfiguration;
    const selectedGateNames = this.gates
        .filter(g => g.selected)
        .map(g => g.name)
        .sort()
        .join(',');
    
    const state = {
        qubits: config.qubits,
        shots: config.shots,
        outputQubits: config.outputs ? config.outputs.map((o, i) => o ? i : -1).filter(i => i !== -1).join(',') : '',
        gates: selectedGateNames,
        
        startCols: this.mapColumnsToStrings(config.blockCircuit.startingColumns),
        leftCols: this.mapColumnsToStrings(config.blockCircuit.block.leftColumns),
        rightCols: this.mapColumnsToStrings(config.blockCircuit.block.rightColumns),
        
        minColumns: config.minNumberOfColumns,
        maxColumns: config.maxNumberOfColumns,
        popSize: config.populationSize,
        desiredError: this.pc.desiredError,
        
        currentNotes: this.captureNotesState(),

        massiveMutationPolicy: {
            fallsThreshold: this.pc.massiveMutationPolicy.fallsThreshold,
            applicableWhenBestFitnessFalls: this.pc.massiveMutationPolicy.applicableWhenBestFitnessFalls,
            applicableWhenMeanFitnessFalls: this.pc.massiveMutationPolicy.applicableWhenMeanFitnessFalls,
            fitnessPercentage: this.pc.massiveMutationPolicy.fitnessPercentage,
            maxConsecutiveApplications: this.pc.massiveMutationPolicy.maxConsecutiveApplications,
        },

        //deleteFiles: this.pc.inputConfiguration!.deleteFiles,
        numberOfBlocks: this.pc.inputConfiguration!.blockCircuit.numberOfBlocks
    };
    return JSON.stringify(state);
  }

  private checkForChanges() {
    if (!this.lastSavedCircuitState) {
        this.isCircuitModified = true;
        return;
    }
    const currentState = this.captureCircuitState();
    this.isCircuitModified = currentState !== this.lastSavedCircuitState;
  }

  saveState() {
    localStorage.setItem('qucoConfigurationBlocks', JSON.stringify(this.pc.inputConfiguration.blockCircuit));
    localStorage.setItem('blocksQubits', JSON.stringify(this.pc.inputConfiguration.qubits));
      
    this.checkForChanges();
  }

  openDeleteProjectModal() {
    if (!this.selectedProjectId) return;
    this.showDeleteProjectModal = true;
  }

  cancelDeleteProject() {
    this.showDeleteProjectModal = false;
  }

  confirmDeleteProject() {
    if (!this.selectedProjectId) return;

    const projectIdToDelete = this.selectedProjectId;
    
    const requestBody = { projectId: projectIdToDelete };

    this.projectService.deleteProject(requestBody).subscribe({
        next: () => {
            this.mensajeTemporal2 = `Project "${this.circuitName}" deleted successfully!`;
            setTimeout(() => this.mensajeTemporal2 = '', 3000);
            
            this.showDeleteProjectModal = false;
            
            this.selectedProjectId = '';
            this.circuitName = '';
            this.lastSavedCircuitState = '';
            this.isCircuitModified = false;
            
            localStorage.removeItem('selectedProjectId_blocks');

            this.reload(); 
            this.loadProjectNames();
        },
        error: (err: any) => {
            console.error('Error deleting project:', err);
            alert('Error deleting project. Check console.');
            this.showDeleteProjectModal = false;
        }
    });
  }

  openSaveOrSaveAsNewModal(isNew: boolean) {
    this.saveError = '';
    
    if (isNew) {
        this.selectedProjectId = '';
        this.circuitName = this.circuitName || 'New Project';
    } else if (!this.selectedProjectId) {
        this.circuitName = '';
    }
    
    this.mostrarModalGuardarProyecto = true;
  }

  openApplyChangesModal() {
    this.showApplyChangesModal = true;
  }

  cancelApplyChanges() {
    this.showApplyChangesModal = false;
  }

  confirmApplyChanges() {
    this.showApplyChangesModal = false;
    this.circuitName = this.circuitName || '';
    this.applyChanges = true;
    this.guardarProyecto();
  }

  checkNotesChangeAndClose(event: any) {
    this.mostrarNotasModal = false;
    
    if (this.selectedProjectId) {
        this.checkForChanges();
        
        if (this.isCircuitModified) {
             this.mensajeTemporal = 'Notes changed, save required.';
             setTimeout(() => this.mensajeTemporal = '', 2000);
        }
    }
  }

}
