import { Component, HostListener } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Individual } from '../common/Individual';
import { EvolutionaryService } from '../evolutionary.service';
import { EvolutionaryComponent } from '../common/evolutionary.component';
import { ManagerService } from '../manager.service';
import { CodeTemplate } from '../templates/CodeTemplate';
import { NotificationService } from '../notification.service';
import { Backend } from '../deterministic/Backend';
import { TranspileService } from '../transpile.service';
import { ProjectService } from '../project.service';


interface QProgramExpression { name: string; expr: string; description: string; type: string; }
interface QProgram { id: string; qubits: number; expressions: QProgramExpression[]; shots: number; generator: any; qcodes: { platform: string, code: string }[]; inputQubits: string; outputQubits: string; qCircuit: any; }
interface ProjectListItem { id: string; name: string; type: string; }
interface StoredProject { id: string; name: string; qProgram: any; projectNotes: any[]; }
interface FinalPayload { circuit: any; user: { id: string }; }

Chart.register(...registerables)

@Component({
  selector: 'app-elonging',
  templateUrl: './elonging.component.html',
  styleUrls: ['./elonging.component.css']
})
export class ElongingComponent extends EvolutionaryComponent {

  message: string | null = null;

  modalTranspile: boolean = false;
  transpiledCode: string = '';
  availableBackends: Backend[] = [];
  selectedBackends: Backend[] = [];
  mostrarInstEjecucion = false;
  mostrarEjecucionRemote = false;

  projectList: ProjectListItem[] = [];
  selectedProjectId: string = '';

  mostrarModalGuardarProyecto: boolean = false;
  saveError: string = '';

  userEmail: string = localStorage.getItem('userEmail') || '';
  userToken: string = localStorage.getItem('userToken') || '';

  GENETIC_GENERATOR_FQCN = 'Genetic';
  REQUIRED_GENERATOR_TYPE = this.GENETIC_GENERATOR_FQCN;

  responseReceived?: any
  mostrarNotasModal: boolean = false;
  nombreComponente: string = 'Genetic';
  tipoLocal: string = 'quco_genetic';
  storedNotesStr = localStorage.getItem('project_notes');

  isCircuitModified: boolean = false;
  private lastSavedCircuitState: string = '';

  showDeleteProjectModal: boolean = false;
  showApplyChangesModal: boolean = false;
  applyChanges: boolean = false;

  constructor(private evolutionaryService: EvolutionaryService, public manager: ManagerService, private notificationService: NotificationService,
    public transpileService: TranspileService, private projectService: ProjectService) {
    super(evolutionaryService, "elonging")
  }

  ngAfterViewInit(): void {
    this.tieneFrecuenciasEsperadas()
    const tabs = document.querySelectorAll<HTMLButtonElement>(".tab");
    const contents = document.querySelectorAll<HTMLElement>(".tab-content");

    this.pc.inputConfiguration.minNumberOfColumns = 4;
    this.pc.inputConfiguration.maxNumberOfColumns = 20;

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

  rf: any;

  ngOnInit() {

    localStorage.removeItem('qucoConfigurationBlocks');
    localStorage.removeItem('qucoConfiguration');

    const savedProjectId = localStorage.getItem('selectedProjectId_genetic');
    if (savedProjectId && this.userEmail && this.userToken) {
      this.selectedProjectId = savedProjectId;
      this.onProjectSelected();
    }

    this.loadProjectNames();

    for (let i = 0; i < this.remoteFitnessers.length; i++) {
      if (this.remoteFitnessers[i].name === 'SimpleFitnesser') {
        this.rf = this.remoteFitnessers[i]
        this.rf.selected = true
        this.selectFitnesser(this.rf);
      }
    }

    localStorage.setItem('isBlocks', "false");
    localStorage.setItem('isGenetic', "true");

    this.transpileService.getBackends().subscribe(backends => {
      this.availableBackends = backends;
    });


    this.selectedBackends = JSON.parse(localStorage.getItem('selectedBackends') || '[]');
    this.availableBackends = JSON.parse(localStorage.getItem('availableBackends') || '[]');

    this.selectedRemoteFitnessers = JSON.parse(localStorage.getItem('selectedRemoteFitnessers') || '[]');

    this.loadStrategies();

    window.addEventListener('beforeunload', this.confirmExit);

    this.notificationService.getMessages().subscribe(msg => {
      this.message = msg;
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
  mensajeTemporal2: string = '';
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

  circuitName: string = '';


  override generateInitialPopulation() {
    this.running = true
    this.state = "Generating initial population!"
    this.error = undefined
    this.showCharts = true;
    this.generateClicked = true;

    if (this.selectedRemoteFitnessers.length == 0) {
      this.error = "You must select one fitnesser at least"
    } else {
      let selectedGates = this.gates.filter(g => g.selected)
      let qubitGates = selectedGates.filter(g => g.affectedQubits == 1)
      if (qubitGates.length == 0)
        this.pc.probOf1QubitGates = 0
      qubitGates = selectedGates.filter(g => g.affectedQubits == 2)
      if (qubitGates.length == 0)
        this.pc.probOf2QubitGates = 0
      qubitGates = selectedGates.filter(g => g.affectedQubits == 3)
      if (qubitGates.length == 0)
        this.pc.probOf3QubitGates = 0
      qubitGates = selectedGates.filter(g => g.affectedQubits == 1000)
      if (qubitGates.length == 0)
        this.pc.probOfNQubitGates = 0

      this.pc.gateNames = []
      for (let i = 0; i < selectedGates.length; i++)
        this.pc.gateNames.push(selectedGates[i].name!)
      this.pc.codeTemplate = this.manager.selectedTemplate
      this.service.generateInitialPopulation(this.pc).subscribe(
        result => {
          this.error = undefined
          this.state = undefined
          this.prepareCharts()
          for (let i = 0; i < this.selectedRemoteFitnessers.length; i++) {
            this.strategies[i] = []
            this.bestFitnesses[i] = []
            this.meanFitnesses[i] = []
            this.meanErrors[i] = []
          }

          for (let i = 0; i < this.pc.inputConfiguration.populationSize; i++) {
            this.individuals.push(new Individual(i))
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
    this.manager.selectedTemplate = this.manager.templates.find(t => t.fileName == selected.fileName) || new CodeTemplate("", "", "")
    console.log('Plantilla seleccionada:', this.manager.selectedTemplate);
    console.log('plantillas:', this.manager.templates);
    this.templateSelected = true;

    localStorage.setItem('templateSelected', JSON.stringify(this.templateSelected));
    localStorage.setItem('selectedTemplate', JSON.stringify(this.manager.selectedTemplate));
  }

  toggleTooltipGeneration(event: MouseEvent): void {
    event.stopPropagation();

    if (this.tooltipGenerationVisible) {
      this.tooltipGenerationVisible = false;
    } else {
      this.tooltipGenerationVisible = true;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
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

  validarGates(): boolean {
    return this.gates.some(g => g.affectedQubits === 1 && g.selected)
      && this.gates.some(g => g.affectedQubits === 2 && g.selected)
      && this.gates.some(g => g.affectedQubits === 3 && g.selected)
      && this.gates.some(g => g.affectedQubits >= 4 && g.selected);
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
    //if (!this.validarGates()) return true;

    return false;
  }

  validarDatosInputMin(): boolean {
    const config = this.pc.inputConfiguration;
    if (config.minNumberOfColumns == null || config.minNumberOfColumns < 4) return true;
    return false;
  }

  validarDatosInputMax(): boolean {
    const config = this.pc.inputConfiguration;
    if (config.maxNumberOfColumns == null || config.maxNumberOfColumns < 4) return true;
    return false;
  }

  validarInputPopSizeInit(): boolean {
    const config = this.pc.inputConfiguration;
    if (config.populationSize == null || config.populationSize < 2 || config.populationSize % 2 !== 0) return true;
    return false;
  }

  validarInputPopSizeMax(): boolean {
    const config = this.pc.inputConfiguration;
    if (config.maxPopulationSize == null || config.maxPopulationSize < 2 || config.maxPopulationSize % 2 !== 0) return true;
    return false;
  }

  validarInputError(): boolean {
    const config = this.pc.inputConfiguration;
    if (this.pc.desiredError == null || this.pc.desiredError < 0) return true;
    return false;
  }

  tieneFrecuenciasEsperadas(): boolean {
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
    try {
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




  getGeneratorData(): any {
    const config = this.pc.inputConfiguration;
    const selectedGateNames = this.gates
      .filter(g => g.selected)
      .map(g => g.name);

    return {
      "type": "GENETIC",

      "hadamards": config.startWithH,
      "minColumns": config.minNumberOfColumns,
      "maxColumns": config.maxNumberOfColumns,
      "initPopSize": config.populationSize,
      "maxPopSize": config.maxPopulationSize,
      "desiredError": this.pc.desiredError,
      "gates": selectedGateNames
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

    if (!this.circuitName || this.circuitName.trim().length === 0) {
      console.error("No se puede guardar: el nombre del circuito es obligatorio.");
      this.saveError = "Guardado fallido: el nombre del proyecto es obligatorio.";
      return;
    }

    //const idCircuit = crypto.randomUUID();
    let idCircuit: string;

    if (this.applyChanges) {
      idCircuit = this.selectedProjectId;
      this.applyChanges = false;
    } else {
      idCircuit = crypto.randomUUID();
    }

    /*let quirkCircuitData: any = {};
    if (this.quirkURL) {
      const urlString = this.sanitizer.sanitize(4, this.quirkURL) as string;
      const match = urlString.match(/circuit=(.*)/);
      if (match && match[1]) {
        try {
          quirkCircuitData = JSON.parse(decodeURIComponent(match[1]));
        } catch (e) {
          console.error("Error al parsear JSON del quirkURL:", e);
        }
      }
    }*/

    let quirkCircuitData: any = {};

    if (this.responseReceived && this.responseReceived["QUIRK"] && this.responseReceived["QUIRK"].length > 0) {
      quirkCircuitData = this.responseReceived["QUIRK"][0];
    }

    let finalQuirkPayload: any = quirkCircuitData;

    if (finalQuirkPayload.cols) {
      finalQuirkPayload.cols = finalQuirkPayload.cols.map((col: any[]) => {
        if (col.some(item => item === "…")) {
          return col;
        }

        let lastSignificantIndex = col.length - 1;
        while (lastSignificantIndex >= 0 && col[lastSignificantIndex] === 1) {
          lastSignificantIndex--;
        }

        return col.slice(0, lastSignificantIndex + 1);
      });
    }

    if (!finalQuirkPayload.cols && !finalQuirkPayload.gates) {
      finalQuirkPayload = { cols: [] };
    }

    console.log('Final quirk payload to be sent:', finalQuirkPayload);

    const generatorData = this.getGeneratorData();
    const qProgramExpressions: QProgramExpression[] = [];

    const qProgram: QProgram = {
      id: idCircuit,
      qubits: this.pc.inputConfiguration.qubits,
      expressions: qProgramExpressions,
      shots: this.pc.inputConfiguration.shots,
      generator: generatorData,
      qcodes: [
        {
          platform: "AerSimulator",
          code: this.code || "No qiskit code generated."
        }
      ],
      inputQubits: Array.from({ length: this.pc.inputConfiguration.qubits || 0 }, (_, i) => i).join(','),
      outputQubits: this.pc.inputConfiguration.outputs
        .map((selected, index) => selected ? index : -1)
        .filter(index => index !== -1)
        .join(','),
      qCircuit: {
        id: idCircuit,
        qbits: this.pc.inputConfiguration.qubits,
        quirkCode: finalQuirkPayload
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

    const finalPayload: any = {
      circuit: projectDtoForMapping,
      user: { id: this.userEmail }
    };

    console.log('Objeto JSON a guardar:', JSON.stringify(finalPayload, null, 2));


    this.projectService.saveProject(finalPayload).subscribe({
      next: (response: unknown) => {
        //alert('Project "' + this.circuitName + '" saved successfully!');
        this.mensajeTemporal2 = `Project "${this.circuitName}" saved successfully!`;
        setTimeout(() => {
          this.mensajeTemporal2 = '';
        }, 1000);
        this.loadProjectNames();
        this.selectedProjectId = idCircuit;
        this.isCircuitModified = false;
      },
      error: (error: any) => {
        console.error('Errorl saving project: ', error);
        alert('Error saving project (Code 400). Check the console and the API documentation.');
      }
    });
  }


  loadProjectNames(): void {
    if (this.userEmail && this.userToken) {
      const requestBody = this.getAuthRequestBody();

      this.projectService.getProjectsName(requestBody).subscribe({
        next: (data: ProjectListItem[]) => {
          this.projectList = data.filter(project =>
            project.type === this.REQUIRED_GENERATOR_TYPE
          );
          console.log("Project names loaded.", this.projectList);
        },
        error: (err) => {
          console.log('Error loading project names', err);
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
        //alert(`Proyecto "${project.name}" cargando...`);
        this.mensajeTemporal2 = `Loading project "${project.name}"...`;
        setTimeout(() => {
          this.mensajeTemporal2 = '';
        }, 1000);
        setTimeout(() => {
          this.loadProjectDataToComponent(project);
          const tabs = document.querySelectorAll<HTMLButtonElement>(".tab");
          const contents = document.querySelectorAll<HTMLElement>(".tab-content");
          tabs[0].classList.add("active");
          contents[0].classList.add("active");
          tabs[1].classList.remove("active");
          contents[1].classList.remove("active");
        }, 1000);


      },
      error: (err) => {
        console.log('Error loading project details', err);
        alert('Error loading project details. Check console for details.');
      }
    });
  }

  loadProjectDataToComponent(project: StoredProject): void {
    if (!project.qProgram) return;

    const qp = project.qProgram;
    const generator = qp.generator;
    const config = this.pc.inputConfiguration;

    this.circuitName = project.name;

    localStorage.setItem('selectedProjectId_genetic', project.id);

    config.qubits = qp.qubits;
    const outputQubitsString = qp.outputQubits ? qp.outputQubits.toString() : '';

    const outputIndices: number[] = outputQubitsString
      .split(',')
      .map((s: string) => parseInt(s.trim(), 10))
      .filter((n: number) => !isNaN(n));

    config.outputs = Array(qp.qubits).fill(false);
    outputIndices.forEach(i => {
      if (i >= 0 && i < qp.qubits) {
        config.outputs[i] = true;
      }
    });

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

    if (generator.type === 'GENETIC') {
      config.startWithH = generator.hadamards;
      config.minNumberOfColumns = generator.minColumns;
      config.maxNumberOfColumns = generator.maxColumns;
      config.populationSize = generator.initPopSize;
      config.maxPopulationSize = generator.maxPopSize;
      this.pc.desiredError = generator.desiredError;

      const savedGates: string[] = generator.gates || [];
      this.gates.forEach(g => {
        g.selected = savedGates.includes(g.name!);
      });
      this.saveGates();
    }

    this.updateExpectedFrequencies();
    this.validarDatos();

    this.notBuilt = false;

    /*this.mensajeTemporal2 = `Project "${project.name}" loaded successfully.`;
    setTimeout(() => {
      this.mensajeTemporal2 = '';
    }, 1000);*/

    setTimeout(() => {
      this.updateExpectedFrequencies();
      this.validarDatos();
      this.notBuilt = false;

      this.lastSavedCircuitState = this.captureCircuitState();
      this.isCircuitModified = false;

      this.mensajeTemporal2 = `Project "${project.name}" loaded successfully.`;
      setTimeout(() => { this.mensajeTemporal2 = ''; }, 1000);
    }, 200);
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


  private captureNotesState(): string {
    const allNotesStr = localStorage.getItem('project_notes');
    if (!allNotesStr) return '[]';

    try {
      const tipoLocal = 'quco_' + this.nombreComponente.toLowerCase();
      const allNotes = JSON.parse(allNotesStr);
      const editorNotes = allNotes
        .filter((n: any) => (n.type || '').toLowerCase() === tipoLocal.toLowerCase())
        .map((n: any) => ({ title: n.title, text: n.text, type: n.type }));
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
      minColumns: config.minNumberOfColumns,
      maxColumns: config.maxNumberOfColumns,
      initPopSize: config.populationSize,
      maxPopSize: config.maxPopulationSize,
      desiredError: this.pc.desiredError,
      startWithH: config.startWithH,
      outputs: config.outputs.map(o => o ? 1 : 0).join(','),

      frequencies: JSON.stringify(config.expectedFrequencies),

      prob1Q: this.pc.probOf1QubitGates,
      prob2Q: this.pc.probOf2QubitGates,
      prob3Q: this.pc.probOf3QubitGates,
      probNQ: this.pc.probOfNQubitGates,

      gates: selectedGateNames,
      template: this.manager.selectedTemplate.fileName,
      currentNotes: this.captureNotesState()
    };
    return JSON.stringify(state);
  }

  private checkForChanges() {
    if (!this.selectedProjectId || !this.lastSavedCircuitState) {
      this.isCircuitModified = false;
      return;
    }
    const currentState = this.captureCircuitState();
    this.isCircuitModified = currentState !== this.lastSavedCircuitState;
  }

  saveState() {
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
        localStorage.removeItem('selectedProjectId_genetic');

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

  openSaveOrSaveAsNewModal(isNew: boolean) {
    this.saveError = '';

    this.applyChanges = !isNew && !!this.selectedProjectId;

    if (isNew || !this.selectedProjectId) {
      this.circuitName = this.circuitName || `New ${this.nombreComponente} Project`;
    }

    this.mostrarModalGuardarProyecto = true;
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
