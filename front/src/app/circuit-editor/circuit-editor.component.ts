import { Component } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { EdCircuit, EdGate, EdQubit } from './EdCircuit';
import * as jsonData from '../../assets/factorize667.json';
import { ManagerService } from '../manager.service';
import { CodeTemplate } from '../templates/CodeTemplate';
import { QubitsConfiguration } from '../qubits-configuration/QubitConfiguration';
import { QiskitService } from '../qiskit.service';
import { QubitsConfigurationService } from '../qubits-configuration.service';
import { EdCircuitsService } from '../ed-circuits.service';

import { Backend } from '../deterministic/Backend';
import { TranspileService } from '../transpile.service';
import { ProjectService } from '../project.service';
import { QuantumDslService, DslPreset, DslGateTemplate } from './dsl/quantum-dsl.service';
import { InstantiatedCircuit } from './dsl/quantum-dsl.model';

interface QProgramExpression { name: string; expr: string; description: string; type: string; }
interface QProgram { id: string; qubits: number; expressions: QProgramExpression[]; shots: number; generator: any; qcodes: { platform: string, code: string }[]; qCircuit: any; }
interface ProjectListItem { id: string; name: string; type: string; }
interface StoredProject { id: string; name: string; qProgram: any; projectNotes: any[]; }
interface FinalPayload { circuit: any; user: { id: string }; }
interface CircuitGate { id: string; name: string; column: number; qubits: number[]; parentQubit: number; transactionId: string; }

@Component({
  selector: 'app-circuit-editor',
  templateUrl: './circuit-editor.component.html',
  styleUrls: ['./circuit-editor.component.css'],
})
export class CircuitEditorComponent {

  creatingNewGate: boolean = false;
  selectedGate?: EdGate;
  code?: string;
  error?: any

  selectedCircuitName: string | null = null
  circuit?: EdCircuit
  circuitNames: string[] = []

  selectedQubitsConfigurationName: string | null = null
  qubitsConfiguration?: QubitsConfiguration
  existingConfigurationNames: string[] = []

  f667: any = jsonData

  Math: any = Math

  customizedGates: EdGate[] = [];
  defaultGates: EdGate[] = [
    new EdGate('M', 1),
    new EdGate('H', 1)
  ];

  dslGenericGates: EdGate[] = [];

  get userOnlyCustomizedGates(): EdGate[] {
    return this.customizedGates.filter(g => !this.isGenericDslGate(g));
  }

  isGenericDslGate(gate: any): boolean {
    if (!gate) return false;
    return Boolean(gate.isGeneric || gate.generic || gate.isDslGeneric);
  }

  mensajeTemporal: string = '';
  mensajeTemporal2: string = '';
  searchQuery: string = "";
  modalCodigo: boolean = false;
  mostrarModalCrear: boolean = false;
  gateMselected: boolean = false;
  gatesModal: boolean = false;
  showDeleteModal: boolean = false;
  deleteIndex: number = 0;
  gateToDelete?: EdGate;
  modalCodigoGate: boolean = false;
  modalTranspile: boolean = false;
  mostrarInstEjecucion = false;
  isEditingCode: boolean = false;

  circuitName: string = '';
  transpiledCode: string = '';
  availableBackends: Backend[] = [];
  selectedBackends: Backend[] = [];

  gateRegistry: CircuitGate[] = [];

  showPlacementChoiceModal: boolean = false;
  currentStartQubit: number | null = null;
  currentColumn: number | null = null;
  qubitsConsecutivos: boolean = false;
  mostrarEjecucionRemote = false;
  mostrarDownloadModal = false;
  mostrarDownloadModalGate = false;

  projectList: ProjectListItem[] = [];
  selectedProjectId: string = '';

  mostrarModalGuardarProyecto: boolean = false;
  saveError: string = '';

  userEmail: string = localStorage.getItem('userEmail') || '';

  EDITOR_GENERATOR_FQCN = 'EDITOR';
  REQUIRED_GENERATOR_TYPE = this.EDITOR_GENERATOR_FQCN;

  responseReceived?: any
  mostrarNotasModal: boolean = false;
  nombreComponente: string = 'Editor';
  tipoLocal: string = 'quco_editor';

  storedNotesStr = localStorage.getItem('project_notes');

  isCircuitModified: boolean = false;
  private lastSavedCircuitState: string = '';

  showDeleteProjectModal: boolean = false;
  showApplyChangesModal: boolean = false;
  showHelp: boolean = false;

  // Quantum DSL Properties
  mostrarModalDsl: boolean = false;
  dslGatesModal: boolean = false;
  showDeleteDslGateModal: boolean = false;
  dslGateToDelete?: EdGate;
  isSyncingDsl: boolean = false;
  dslGateTemplates: DslGateTemplate[] = [];
  selectedDslTemplateId: string = 'diffuser';
  newDslGateName: string = 'Diffuser';
  newDslGateDesc: string = 'Grover Diffuser: D(n) = h(n) · x(n) · mcp(n, pi, n-1) · x(n) · h(n)';
  newDslGateExpression: string = 'Diffuser = h(n) · x(n) · mcp(n, pi, n-1) · x(n) · h(n)';
  newDslGateCode: string = '';
  dslCompileError: string = '';
  selectedGenericGateForPlacement?: EdGate;
  showDslFloatingHelp: boolean = false;
  dslHelpActiveTab: 'overview' | 'template' | 'dsl' | 'code' | 'metadata' = 'overview';

  selectedDslPresetId: string = 'g_4_2_7_expanded';
  dslExpression: string = "g_4_2_7 = h(4) · [O(4, 2) · O(4, 7) · D(4)]{3} · M(4, '+')";
  dslExpansionMode: 'EXPANDED' | 'MODULAR_BLOCKS' = 'EXPANDED';
  dslQubits: number = 4;
  dslError: string = '';
  dslCompiledCircuit?: InstantiatedCircuit;
  dslActiveTab: 'summary' | 'qiskit_modular' | 'qiskit_inline' | 'ast' = 'summary';

  // Parámetros para colocar puertas DSL en la cuadrícula
  showDslPlacementModal: boolean = false;
  selectedDslGenericType: string = '';
  dslPlacementName: string = '';
  dslPlacementQubits: number = 4;
  dslPlacementValue: number = 2;
  dslPlacementAlpha: string = 'pi';
  dslPlacementTarget: number = 3;
  dslPlacementOrder: string = '+';
  dslPlacementIterations: number = 2;
  dslPlacementSubValues: string = '2, 7';

  private readonly LOCAL_STORAGE_KEYS = {
    CIRCUIT: 'circuitEditorCircuit',
    QUBITS_CONFIG_NAME: 'circuitEditorQubitsConfigName',
    GATE_REGISTRY: 'circuitEditorGateRegistry',
    SELECTED_TEMPLATE_FILENAME: 'circuitEditorTemplateFileName',
    CUSTOM_GENERIC_GATES: 'circuitEditorCustomGenericGates'
  };

  constructor(public manager: ManagerService, private qiskitService: QiskitService, private qubitsConfigurationService: QubitsConfigurationService,
    private circuitsService: EdCircuitsService, public transpileService: TranspileService, private projectService: ProjectService,
    public dslService: QuantumDslService) {
    this.qiskitService.getCustomizedGates().subscribe(
      gates => {
        for (let i = 0; i < gates.length; i++) {
          const g = gates[i];
          if (this.defaultGates.some(dg => dg.name === g.name)) continue;
          let edGate = new EdGate(g.name, g.qubits);
          edGate.description = g.description;
          edGate.code = g.code;
          edGate.isGeneric = Boolean(g.isGeneric ?? g.generic ?? g.isDslGeneric ?? false);
          (edGate as any).isFunction = g.function ?? g.isFunction;

          if (this.isGenericDslGate(edGate)) {
            edGate.isGeneric = true;
            (edGate as any).isDslGeneric = true;
            (edGate as any).dslType = g.name;
            const existingIdx = this.dslGenericGates.findIndex(dg => dg.name === g.name);
            if (existingIdx >= 0) {
              this.dslGenericGates[existingIdx] = edGate;
            } else {
              this.dslGenericGates.push(edGate);
            }
          } else {
            if (!this.customizedGates.some(cg => cg.name === g.name)) {
              this.customizedGates.push(edGate);
            }
          }
        }
        // Ordenar dslGenericGates de forma consistente
        const preferredOrder = ['InitialH', 'Oracle', 'Diffuser', 'MCP', 'Measure', '0', 'Subcircuito_0'];
        this.dslGenericGates.sort((a, b) => {
          const nameA = a.name || '';
          const nameB = b.name || '';
          const idxA = preferredOrder.indexOf(nameA);
          const idxB = preferredOrder.indexOf(nameB);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return nameA.localeCompare(nameB);
        });

        // Asegurarse de que ninguna compuerta genérica quede en customizedGates
        this.customizedGates = this.customizedGates.filter(cg => !this.isGenericDslGate(cg));
      },
      error => {
        this.error = error?.error?.message || error?.message || 'Error loading gates from database';
      });

    this.qubitsConfigurationService.getQubitConfigurationNames().subscribe(
      qubitsConfiguration => {
        this.existingConfigurationNames = qubitsConfiguration
      })

    this.circuitsService.getCircuitNames().subscribe(
      circuits => {
        this.circuitNames = circuits
      })

    const hGate = this.defaultGates.find(g => g.name === 'H');
    if (hGate) {
      hGate.description = 'Hadamard gate';
      hGate.code = 'circuit.h(i)';
    }

  }

  ngOnInit() {

    this.userEmail = localStorage.getItem('userEmail') || '';

    this.transpileService.getBackends().subscribe(backends => {
      this.availableBackends = backends;
    });

    console.log("Notas:", this.storedNotesStr);

    this.selectedBackends = JSON.parse(localStorage.getItem('selectedBackends') || '[]');
    this.availableBackends = JSON.parse(localStorage.getItem('availableBackends') || '[]');

    const initSelectedTemplate = () => {
      const savedTemplateFileName = localStorage.getItem(this.LOCAL_STORAGE_KEYS.SELECTED_TEMPLATE_FILENAME);
      if (savedTemplateFileName) {
        const found = this.manager.templates.find(t => t.fileName === savedTemplateFileName);
        if (found && found.code && found.code.includes('#INITIALIZE#')) {
          this.manager.selectedTemplate = found;
          return;
        }
      }
      const circuitTpl = this.manager.templates.find(t => t.code && t.code.includes('#INITIALIZE#')) ||
        this.manager.templates.find(t => t.fileName.includes('circuit_editor')) ||
        this.manager.templates[0];
      if (circuitTpl) {
        this.manager.selectedTemplate = circuitTpl;
      }
    };

    if (this.manager.templates && this.manager.templates.length > 0) {
      initSelectedTemplate();
    }
    this.manager.templatesLoaded.subscribe(() => {
      initSelectedTemplate();
    });


    const savedRegistry = localStorage.getItem(this.LOCAL_STORAGE_KEYS.GATE_REGISTRY);
    if (savedRegistry) {
      this.gateRegistry = JSON.parse(savedRegistry);
    }

    this.dslGateTemplates = this.dslService.gateTemplates;
    this.loadCustomGenericGatesFromStorage();


    this.qubitsConfigurationService.getQubitConfigurationNames().subscribe(
      qubitsConfigurationNames => {
        this.existingConfigurationNames = qubitsConfigurationNames;

        const savedConfigName = localStorage.getItem(this.LOCAL_STORAGE_KEYS.QUBITS_CONFIG_NAME);
        let configToLoad = savedConfigName || qubitsConfigurationNames[0];

        if (configToLoad) {
          this.selectedQubitsConfigurationName = configToLoad;
          this.onQubitsConfigurationChange(this.selectedQubitsConfigurationName, true);
          this.searchQuery = this.selectedQubitsConfigurationName;
        }
      });

    let sessionAttempts = 0;
    const initSession = setInterval(() => {
      this.userEmail = localStorage.getItem('userEmail') || '';
      if (this.userEmail) {
        clearInterval(initSession);
        this.loadProjectNames();

        const savedProjectId = localStorage.getItem('selectedProjectId_editor');
        if (savedProjectId) {
          this.selectedProjectId = savedProjectId;
          this.onProjectSelected();
        }
      } else if (++sessionAttempts >= 12) {
        clearInterval(initSession);
      }
    }, 250);
  }

  measureColumn(column: number) {
    if (!this.circuit)
      return

    let allMeasures = true;
    let occupied = false;

    for (let i = 0; i < this.circuit.qubits.length; i++) {
      let gate = this.circuit.qubits[i].gates[column];

      if (gate.name !== 'I' && gate.name !== '0') {
        occupied = true;
      }
      if (gate.name !== 'M' && gate.name !== 'I' && gate.name !== '0') {
        allMeasures = false;
        break;
      }
    }

    if (occupied && allMeasures) {
      for (let i = 0; i < this.circuit.qubits.length; i++) {
        const gate = new EdGate('I', 1);
        gate.columnIndex = column;
        this.circuit.qubits[i].gates[column] = gate;
      }

      this.gateRegistry = this.gateRegistry.filter(r => r.column !== column);
      this.saveState();
      return;
    }

    if (occupied) {
      let option = confirm("This column has other gates. Do you want to continue anyway?");
      if (!option)
        return;
    }

    for (let i = 0; i < this.circuit.qubits.length; i++) {
      const gate = new EdGate('I', 1);
      gate.columnIndex = column;
      this.circuit.qubits[i].gates[column] = gate;
    }

    this.gateRegistry = this.gateRegistry.filter(r => r.column !== column);

    const newTransactionId = `T-MEASURE-${Date.now()}-${column}`;

    for (let i = 0; i < this.circuit.qubits.length; i++) {
      const measureGate = new EdGate('M', 1);
      measureGate.columnIndex = column;

      (measureGate as any).transactionId = newTransactionId;
      (measureGate as any).gateId = `${newTransactionId}-${i}`;

      this.circuit.qubits[i].gates[column] = measureGate;

      this.gateRegistry.push({
        id: (measureGate as any).gateId,
        name: 'M',
        column: column,
        qubits: [i],
        parentQubit: i,
        transactionId: newTransactionId
      } as CircuitGate);
    }

    this.saveState();
  }

  saveCircuit(circuit: EdCircuit) {
    this.circuitsService.saveCircuit(circuit).subscribe(
      response => {
        alert("Circuit saved")
      },
      error => {
        this.error = error.error.message
      })
  }

  onCircuitChange(circuitName: string) {
    this.circuitsService.getCircuit(circuitName).subscribe(
      circuit => {
        if (circuit.qubits.length > this.qubitsConfiguration!.qubits) {
          alert("The selected qubits configuration has less qubits than the circuit")
          return
        }
        this.circuit = new EdCircuit()
        this.circuit.name = circuit.name
        for (let i = 0; i < circuit.qubits.length; i++) {
          let qubit = circuit.qubits[i]
          for (let j = 0; j < qubit.gates.length; j++) {
            let gate: EdGate = qubit.gates[j]
            this.circuit.qubits[i].gates[j] = gate
          }
        }
      },
      error => {
        this.error = error.error.message
      }
    )
  }

  onQubitsConfigurationChange(configurationName: string, isLoadingFromStorage: boolean = false) {
    this.qubitsConfigurationService.getQubitsConfiguration(configurationName).subscribe(
      qubitsConfiguration => {
        this.qubitsConfiguration = new QubitsConfiguration()
        this.qubitsConfiguration.name = qubitsConfiguration.name
        this.qubitsConfiguration.matrix = qubitsConfiguration.matrix
        this.qubitsConfiguration.qubits = qubitsConfiguration.qubits

        if (isLoadingFromStorage) {
          const savedCircuit = localStorage.getItem(this.LOCAL_STORAGE_KEYS.CIRCUIT);
          if (savedCircuit) {
            const loadedCircuitData = JSON.parse(savedCircuit);

            const loadedCircuit = new EdCircuit();
            loadedCircuit.name = loadedCircuitData.name;
            loadedCircuit.columns = loadedCircuitData.columns;

            loadedCircuit.qubits = loadedCircuitData.qubits.map((qubitData: any) => {
              const qubit = new EdQubit();
              qubit.gates = qubitData.gates.map((gateData: any, colIndex: number) => {
                const gate = new EdGate(gateData.name, gateData.qubits);
                Object.assign(gate, gateData);
                if (gate.columnIndex === undefined) {
                  gate.columnIndex = colIndex;
                }
                return gate;
              });
              return qubit;
            });

            this.circuit = loadedCircuit;

            this.circuit.resizeTo(this.qubitsConfiguration.qubits);
            setTimeout(() => {
              this.restoreGatesFromRegistry();
            }, 1000);
          } else {
            this.circuit = new EdCircuit()
            this.circuit.columns = 10
            this.circuit.resizeTo(this.qubitsConfiguration.qubits)
          }
        } else {
          if (!this.circuit) {
            this.circuit = new EdCircuit()
            this.circuit.columns = 10
          }
          this.circuit.resizeTo(this.qubitsConfiguration.qubits)
        }

        this.saveState();
        if (!isLoadingFromStorage && this.selectedProjectId) {
          this.isCircuitModified = true;
        }
      },
      error => {
        this.error = error.error.message
      })
  }

  restoreGatesFromRegistry() {
    if (!this.circuit || !this.gateRegistry) return;

    for (let i = 0; i < this.circuit.qubits.length; i++) {
      for (let j = 0; j < this.circuit.columns; j++) {
        const gate = new EdGate('I', 1);
        gate.columnIndex = j;
        this.circuit.qubits[i].gates[j] = gate;
      }
    }

    this.gateRegistry.forEach(registration => {
      const { name, column, qubits, parentQubit, transactionId } = registration;

      if (column >= this.circuit!.columns) return;

      if (parentQubit === qubits[0]) {
        const gateData = this.customizedGates.find(g => g.name === name) || this.dslGenericGates.find(g => g.name === name) || new EdGate(name, qubits.length);
        const gate = gateData.copy();

        gate.qubits = qubits.length;
        (gate as any).gateId = registration.id;
        (gate as any).transactionId = transactionId;
        gate.targetQubits = qubits.slice(1);
        gate.parentQubit = undefined;
        gate.columnIndex = column;

        if ((registration as any).dslParams) {
          (gate as any).dslParams = JSON.parse(JSON.stringify((registration as any).dslParams));
          (gate as any).isDslGeneric = true;
          gate.code = this.generateDslGateCode(name, qubits.length, name, (gate as any).dslParams);
        }

        if (parentQubit < this.circuit!.qubits.length) {
          this.circuit!.qubits[parentQubit].gates[column] = gate;
        }

        for (let i = 1; i < qubits.length; i++) {
          const q = qubits[i];
          if (q < this.circuit!.qubits.length) {
            const filler = new EdGate('0', 1);
            filler.parentQubit = parentQubit;
            (filler as any).gateId = registration.id;
            (filler as any).transactionId = transactionId;
            filler.columnIndex = column;
            this.circuit!.qubits[q].gates[column] = filler;
          }
        }
      }
    });

  }

  getPhysicalQubit(qubit: number) {
    if (!this.qubitsConfiguration)
      return qubit
    return this.qubitsConfiguration.matrix[qubit]
  }

  generateCode(): Observable<any> {
    if (!this.circuit)
      return new Observable(s => s.error("No circuit"));

    // Generar código limpio sincronizado con las puertas colocadas en la cuadrícula
    this.code = this.buildCircuitQiskitCode();

    const gateCodes: { [name: string]: string } = {};
    for (const q of this.circuit.qubits) {
      for (const g of q.gates) {
        if (g && g.name && g.name !== 'I' && g.name !== '0' && g.code) {
          gateCodes[g.name] = g.code;
        }
      }
    }
    for (const cg of this.customizedGates) {
      if (cg && cg.name && cg.code) {
        gateCodes[cg.name] = cg.code;
      }
    }
    for (const dg of this.dslGenericGates) {
      if (dg && dg.name && dg.code) {
        gateCodes[dg.name] = dg.code;
      }
    }

    const payloadTemplateName = (this.manager.selectedTemplate?.code && this.manager.selectedTemplate.code.includes('#INITIALIZE#'))
      ? this.manager.selectedTemplate.fileName
      : (this.manager.templates?.find(t => t.code && t.code.includes('#INITIALIZE#'))?.fileName || 'circuit_editor.template.txt');

    const payload = {
      templateName: payloadTemplateName,
      qubitsConfigurationName: this.qubitsConfiguration?.name,
      circuit: this.circuit,
      gateRegistry: this.gateRegistry,
      gateCodes: gateCodes
    };

    const obs = this.circuitsService.generateCode(payload).pipe(shareReplay(1));
    obs.subscribe({
      next: response => {
        this.responseReceived = response;
        const clientCode = this.buildCircuitQiskitCode();
        if (response && response.CODE && response.CODE.includes('QuantumCircuit') && !response.CODE.includes('# Error loading gate')) {
          this.code = response.CODE;
        } else {
          this.code = clientCode;
        }
      },
      error: error => {
        console.warn("Backend code generation error, using client-side generated code", error);
        this.code = this.buildCircuitQiskitCode();
      }
    });
    return obs;
  }

  buildCircuitQiskitCode(): string {
    if (!this.circuit) return '';

    // 1. Obtener la plantilla seleccionada o la de defecto (circuit_editor)
    let templateCode = this.manager.selectedTemplate?.code;
    if (!templateCode || !templateCode.includes('#INITIALIZE#')) {
      const foundTpl = this.manager.templates?.find(t => t.code && t.code.includes('#INITIALIZE#'));
      if (foundTpl && foundTpl.code) {
        templateCode = foundTpl.code;
      }
    }
    if (!templateCode || templateCode.trim().length === 0) {
      templateCode = `from qiskit import QuantumRegister, ClassicalRegister, QuantumCircuit
from math import pi

qubits = #QUBITS#
outputQubits = #OUTPUT_QUBITS#


shots = #SHOTS#
	  
ONE = [0, 1]
ZERO = [1, 0]

#INITIALIZE#

startQubit = qubits-outputQubits

circuit = QuantumCircuit(qubits, outputQubits)

#CALCULUS#


'''
#Uncomment for measuring all the qubits (circuit.measure(j, j) preserves decimal value in Qiskit counts)

for j in range(startQubit, qubits) :
	circuit.measure(j, j)
'''

'''
from qiskit_aer import AerSimulator
from qiskit import transpile
import matplotlib.pyplot as plt
from qiskit.visualization import plot_histogram

backend = AerSimulator()

transpiled_circuit = transpile(circuit, backend)
job = backend.run(transpiled_circuit, shots = shots)
result = job.result()
counts = result.get_counts()
print(counts)

filtered_counts = {state: count for state, count in counts.items() if count > 0.1 * shots}

plot_histogram(filtered_counts)
plt.show()

#expanded = circuit.decompose(reps=2)   # Esto es para pintar el circuit. A mayor reps, más detalla.
#print(expanded)
'''`;
    }

    // 2. Determinar número de cúbits usados
    let maxQubitIndex = -1;
    if (this.gateRegistry && this.gateRegistry.length > 0) {
      for (const reg of this.gateRegistry) {
        if (reg.qubits) {
          for (const q of reg.qubits) {
            if (q > maxQubitIndex) maxQubitIndex = q;
          }
        }
      }
    }
    for (let i = 0; i < this.circuit.qubits.length; i++) {
      for (let j = 0; j < (this.circuit.columns || 0); j++) {
        const g = this.circuit.qubits[i].gates[j];
        if (g && g.name !== 'I' && (g.parentQubit === undefined || g.name !== '0')) {
          if (i > maxQubitIndex) maxQubitIndex = i;
        }
      }
    }
    const totalQubits = maxQubitIndex >= 0
      ? (maxQubitIndex + 1)
      : Math.min(this.circuit?.qubits.length || 4, 4);

    // 3. Recopilar operaciones ordenadas por columna y cúbit inicial consolidando transacciones
    const operations: { column: number; name: string; qubits: number[]; minQubit: number; gate?: EdGate; dslParams?: any }[] = [];
    const processedTransactions = new Set<string>();

    const registryMap = new Map<string, { column: number; name: string; qubits: Set<number>; minQubit: number; gate?: EdGate; dslParams?: any }>();

    for (const reg of this.gateRegistry || []) {
      const tid = reg.transactionId || `${reg.column}_${reg.parentQubit}_${reg.name}`;
      if (!registryMap.has(tid)) {
        const mainGate = this.circuit.qubits[reg.parentQubit]?.gates[reg.column];
        const minQ = reg.qubits && reg.qubits.length > 0 ? Math.min(...reg.qubits) : reg.parentQubit;
        registryMap.set(tid, {
          column: reg.column,
          name: reg.name,
          qubits: new Set<number>(reg.qubits || []),
          minQubit: minQ,
          gate: mainGate,
          dslParams: (reg as any).dslParams || (mainGate as any)?.dslParams
        });
      } else {
        const item = registryMap.get(tid)!;
        if ((reg as any).dslParams && !item.dslParams) item.dslParams = (reg as any).dslParams;
        if (reg.qubits) {
          for (const q of reg.qubits) {
            item.qubits.add(q);
          }
          const minQ = Math.min(...reg.qubits);
          if (minQ < item.minQubit) item.minQubit = minQ;
        }
      }
    }

    for (const [tid, item] of registryMap.entries()) {
      processedTransactions.add(tid);
      const sortedQubits = Array.from(item.qubits).sort((a, b) => a - b);
      operations.push({
        column: item.column,
        name: item.name,
        qubits: sortedQubits,
        minQubit: item.minQubit,
        gate: item.gate,
        dslParams: item.dslParams || (item.gate as any)?.dslParams
      });
    }

    // Puertas individuales que no estén en gateRegistry
    for (let j = 0; j < (this.circuit.columns || 0); j++) {
      for (let i = 0; i < this.circuit.qubits.length; i++) {
        const g = this.circuit.qubits[i].gates[j];
        if (g && g.name !== 'I' && (g.parentQubit === undefined || g.name !== '0')) {
          const tid = (g as any).transactionId;
          if (!tid || !processedTransactions.has(tid)) {
            const targetQubits = g.targetQubits ? [i, ...g.targetQubits] : [i];
            targetQubits.sort((a, b) => a - b);
            operations.push({
              column: j,
              name: g.name || '',
              qubits: targetQubits,
              minQubit: i,
              gate: g,
              dslParams: (g as any).dslParams
            });
            if (tid) processedTransactions.add(tid);
          }
        }
      }
    }

    operations.sort((a, b) => {
      if (a.column !== b.column) return a.column - b.column;
      return a.minQubit - b.minQubit;
    });

    // 4. Generar definiciones para #INITIALIZE#
    const initializeDefs = new Map<string, string>(); // fnName -> code
    const gateToFnMap = new Map<string, string>(); // gateName -> fnName

    for (const op of operations) {
      const gName = op.name;
      if (gName === 'I' || gName === 'M' || gName.toLowerCase() === 'measure' || gName === 'H' || gName === 'X') {
        continue;
      }

      let code = '';
      const isGeneric = Boolean((op.gate as any)?.isGeneric || (op.gate as any)?.isDslGeneric || this.dslGenericGates.some(dg => dg.name === gName));
      if (isGeneric) {
        code = this.generateDslGateCode(gName, op.qubits.length, gName, op.dslParams || (op.gate as any)?.dslParams);
      } else {
        code = op.gate?.code || this.customizedGates.find(cg => cg.name === gName)?.code || '';
      }

      if (code) {
        let fnName = this.extractFunctionName(code);
        if (!fnName) {
          fnName = (gName.startsWith('get') ? gName : ('get' + (gName === '0' ? 'Subcircuito_0' : gName))).replace(/[^a-zA-Z0-9_]/g, '_');
        }
        gateToFnMap.set(gName, fnName);
        if (!initializeDefs.has(fnName)) {
          initializeDefs.set(fnName, code.trim());
        }
      }
    }

    // 5. Generar llamadas en #CALCULUS# y #MEASURES#
    const calculusLines: string[] = [];
    const measureLines: string[] = [];

    for (const op of operations) {
      const gName = op.name;
      const qubitsStr = op.qubits.join(', ');

      if (gName === 'H') {
        for (const q of op.qubits) {
          calculusLines.push(`circuit.h(${q})`);
        }
      } else if (gName === 'X') {
        for (const q of op.qubits) {
          calculusLines.push(`circuit.x(${q})`);
        }
      } else if (gName === 'M' || gName.toLowerCase() === 'measure') {
        const dslOrder = (op.gate as any)?.dslParams?.order;
        const order = dslOrder ? dslOrder : '-'; // Default is reverse bit mapping (qubits - q - 1)
        for (let idx = 0; idx < op.qubits.length; idx++) {
          const q = op.qubits[idx];
          const targetBit = order === '+' ? q : (totalQubits - q - 1);
          calculusLines.push(`circuit.measure(${q}, ${targetBit})`);
          measureLines.push(`circuit.measure(${q}, ${targetBit})`);
        }
      } else {
        let fnName = gateToFnMap.get(gName);
        if (!fnName) {
          fnName = (gName.startsWith('get') ? gName : ('get' + (gName === '0' ? 'Subcircuito_0' : gName))).replace(/[^a-zA-Z0-9_]/g, '_');
        }
        const defCode = initializeDefs.get(fnName);
        let callArgs = '';
        if (defCode) {
          const fnDefMatch = defCode.match(/def\s+[^\(\s]+\s*\((.*?)\)/);
          if (fnDefMatch && fnDefMatch[1] && fnDefMatch[1].trim().length > 0) {
            const paramsStr = fnDefMatch[1];
            const nQubits = op.qubits.length;
            const dslParams = op.dslParams || (op.gate as any)?.dslParams;
            if (paramsStr.includes('m')) {
              let mVal = dslParams && dslParams.value !== undefined ? dslParams.value : undefined;
              if (mVal === undefined) {
                const oracleOps = operations.filter(o => o.name === 'Oracle');
                const idx = oracleOps.indexOf(op);
                mVal = (idx % 2 === 0) ? 4 : 9;
              }
              callArgs = `${nQubits}, ${mVal}`;
            } else if (paramsStr.includes('n')) {
              callArgs = `${nQubits}`;
            }
          }
        }
        calculusLines.push(`circuit.append(${fnName}(${callArgs}), [${qubitsStr}])`);
      }
    }

    const initializeStr = Array.from(initializeDefs.values()).join('\n\n\n');
    const calculusStr = calculusLines.join('\n');
    const measuresStr = measureLines.join('\n');

    // 6. Sustituir tokens en la plantilla
    let finalCode = templateCode;
    finalCode = finalCode.replace(/#QUBITS#/g, String(totalQubits));
    finalCode = finalCode.replace(/#OUTPUT_QUBITS#/g, String(totalQubits));
    finalCode = finalCode.replace(/#SHOTS#/g, '1000');
    finalCode = finalCode.replace(/#INITIALIZE#/g, initializeStr);
    finalCode = finalCode.replace(/#CALCULUS#/g, calculusStr);
    finalCode = finalCode.replace(/#MEASURES#/g, measuresStr);

    if (this.qubitsConfiguration && this.qubitsConfiguration.matrix) {
      const sliceEnd = Math.min(totalQubits, this.qubitsConfiguration.matrix.length);
      const layoutList = this.qubitsConfiguration.matrix.slice(0, sliceEnd);
      finalCode = finalCode.replace(/#QUBITS_LAYOUT#/g, layoutList.join(', '));
    } else {
      finalCode = finalCode.replace(/, initial_layout=\[#QUBITS_LAYOUT#\]\)/g, ')');
      finalCode = finalCode.replace(/#QUBITS_LAYOUT#/g, '');
    }

    return finalCode;
  }

  extractFunctionName(code: string): string | null {
    if (!code) return null;
    const match = code.match(/def\s+([^\\(\s]+)\s*\(/);
    return match ? match[1].trim() : null;
  }

  addColumn() {
    this.circuit!.addColumn();
    this.saveState();
  }

  removeColumn() {
    this.circuit!.removeColumn();
    this.saveState();
  }

  placeGate(startQubit: number, column: number) {
    if (!this.selectedGate || !this.qubitsConfiguration)
      return;

    const requiredQubits = this.selectedGate.qubits;
    const circuitLength = this.circuit!.qubits.length;

    if (startQubit + requiredQubits > circuitLength) {
      alert("Not enough qubits for this gate");
      return;
    }

    const selectedQubits: number[] = [];
    for (let i = 0; i < requiredQubits; i++) {
      selectedQubits.push(startQubit + i);
    }

    if (!this.areQubitsAvailable(selectedQubits, column)) {
      alert(`Cannot place ${this.selectedGate.name} starting at q${startQubit}. One or more required qubits (q${selectedQubits.join(', q')}) are already occupied.`);
      return;
    }
    this.confirmGatePlacement2(startQubit, column);
  }

  areQubitsAvailable(qubitsIndices: number[], column: number): boolean {
    if (!this.circuit) return false;

    for (const qubitIndex of qubitsIndices) {
      if (qubitIndex >= this.circuit.qubits.length) {
        return false;
      }

      const gate = this.circuit.qubits[qubitIndex].gates[column];

      if (!gate || gate.name !== "I") {
        return false;
      }
    }

    return true;
  }

  confirmGatePlacement2(mainQubit: number, column: number) {

    if (!this.selectedGate || !this.qubitsConfiguration)
      return;

    const requiredQubits = this.selectedGate.qubits;

    const selectedQubits: number[] = [];

    if (mainQubit + requiredQubits > this.circuit!.qubits.length) {
      alert("Not enough qubits for this gate");
      return;
    }

    for (let i = 0; i < requiredQubits; i++) {
      selectedQubits.push(mainQubit + i);
    }

    const newGateId = `T-${Date.now()}`;
    const uniqueGateId = `${newGateId}-${mainQubit}`;

    const gate = this.selectedGate.copy();

    (gate as any).gateId = uniqueGateId;
    (gate as any).transactionId = newGateId;

    this.gateRegistry.push({
      id: uniqueGateId,
      name: gate.name!,
      column: column,
      qubits: selectedQubits,
      parentQubit: mainQubit,
      transactionId: newGateId
    } as CircuitGate);

    this.circuit!.qubits[mainQubit].gates[column] = gate;
    this.circuit!.qubits[mainQubit].gates[column].targetQubits = selectedQubits.slice(1);
    this.circuit!.qubits[mainQubit].gates[column].parentQubit = undefined;
    this.circuit!.qubits[mainQubit].gates[column].columnIndex = column;


    for (let i = 1; i < selectedQubits.length; i++) {
      const q = selectedQubits[i];
      const filler = new EdGate('0', 1);
      filler.parentQubit = mainQubit;
      (filler as any).gateId = uniqueGateId;
      (filler as any).transactionId = newGateId;
      filler.columnIndex = column;

      this.circuit!.qubits[q].gates[column] = filler;
    }

    this.qubitsConsecutivos = true;
    console.log("Gate Registry after placement:", this.gateRegistry);
    this.saveState();
  }

  showGatePlacementModal = false;
  pendingColumn: number | null = null;
  selectedQubitsForGate: number[] = [];

  placeGateSpecification(startQubit: number, column: number) {
    if (!this.selectedGate || !this.qubitsConfiguration) return;

    this.pendingColumn = column;
    this.selectedQubitsForGate = [];

    this.openQubitSelectionModal(column)
    this.showGatePlacementModal = true;
  }

  toggleQubitSelection(index: number, event: any) {
    if (event.target.checked) {
      if (this.selectedQubitsForGate.length >= this.selectedGate!.qubits) {
        event.target.checked = false;
        alert(`This gate only requires ${this.selectedGate!.qubits} qubits.`);
        return;
      }
      this.selectedQubitsForGate.push(index);
    } else {
      this.selectedQubitsForGate = this.selectedQubitsForGate.filter(i => i !== index);
    }
  }

  confirmGatePlacement(selectedQubits: number[], column: number) {

    if (!this.selectedGate || this.pendingColumn === null) return;

    const selected = [...this.selectedQubitsForGate].sort((a, b) => a - b);

    if (selected.length === 0) {
      alert("Please select at least one qubit.");
      return;
    }

    if (selected.length !== this.selectedGate.qubits) {
      alert(`This gate requires ${this.selectedGate.qubits} qubits.`);
      return;
    }

    const transactionId = `T-${Date.now()}`;
    column = this.pendingColumn;

    const groups: number[][] = [];
    let currentGroup: number[] = [selected[0]];

    for (let i = 1; i < selected.length; i++) {
      if (selected[i] === selected[i - 1] + 1) {
        currentGroup.push(selected[i]);
      } else {
        groups.push(currentGroup);
        currentGroup = [selected[i]];
      }
    }
    groups.push(currentGroup);

    for (const group of groups) {
      const uniqueGateId = `${transactionId}-${group[0]}`;
      const gate = this.selectedGate.copy();
      const mainQubit = group[0];

      gate.qubits = group.length;

      (gate as any).gateId = uniqueGateId;
      (gate as any).transactionId = transactionId;

      this.gateRegistry.push({
        id: uniqueGateId,
        name: gate.name!,
        column: column,
        qubits: group,
        parentQubit: mainQubit,
        transactionId: transactionId
      } as CircuitGate);


      this.circuit!.qubits[mainQubit].gates[column] = gate;
      this.circuit!.qubits[mainQubit].gates[column].targetQubits = group.slice(1);
      this.circuit!.qubits[mainQubit].gates[column].parentQubit = undefined;
      this.circuit!.qubits[mainQubit].gates[column].columnIndex = column;

      for (let i = 1; i < group.length; i++) {
        const q = group[i];
        const filler = new EdGate('0', 1);
        filler.parentQubit = mainQubit;
        (filler as any).gateId = uniqueGateId;
        (filler as any).transactionId = transactionId;
        filler.columnIndex = column;

        this.circuit!.qubits[q].gates[column] = filler;
      }
    }

    this.showGatePlacementModal = false;
    this.pendingColumn = null;

    this.qubitsConsecutivos = false;

    console.log("Gate Registry after placement:", this.gateRegistry);
    this.saveState();
  }

  getGateRowspan(gate: any): number {
    if (!gate || !gate.targetQubits) return 1;

    const min = Math.min(...gate.targetQubits);
    const max = Math.max(...gate.targetQubits);

    return max - min + 1;
  }

  cancelGatePlacement() {
    this.showGatePlacementModal = false;
    this.pendingColumn = null;
    this.selectedQubitsForGate = [];
  }





  getGate(qubit: number, column: number): EdGate | null {
    if (!this.circuit)
      return null;
    return this.circuit.qubits[qubit].gates[column]
  }

  selectGate(gate: EdGate) {
    this.gateMselected = false;
    if (this.selectedGate === gate) {
      this.selectedGate = undefined;
    } else {
      this.selectedGate = gate;
    }
  }

  selectMeasurementGate() {
    if (!this.circuit)
      return;
    const mGate = this.defaultGates.find(g => g.name === 'M');
    if (!mGate) return;

    if (this.selectedGate === mGate) {
      this.gateMselected = false;
      this.selectedGate = undefined;
    } else {
      this.selectedGate = mGate;
      this.gateMselected = true;
      this.selectedGate.description = 'Measure qubit';
      //this.selectedGate.code = 'circuit.measure(' + this.circuit.qubits.length + ', ' + this.circuit.qubits.length + ')';
      this.selectedGate.code = 'circuit.measure(i, ' + (this.circuit.qubits.length) + ' - i - 1)';
    }
  }

  createCustomizedGate() {
    this.selectedGate = new EdGate('', 1);
    console.log("Selected gate: ", this.selectedGate);
    this.creatingNewGate = true;
    //this.selectedGate = undefined;

    this.mostrarModalCrear = true;
  }

  addCustomizedGate() {
    this.creatingNewGate = false;
    this.qiskitService.saveGate(this.selectedGate!).subscribe(
      ok => {
        this.customizedGates.push(this.selectedGate!);
        this.mensajeTemporal = 'Gate created successfully';
        this.selectedGate = undefined;
        this.mostrarModalCrear = false;
        setTimeout(() => {
          this.mensajeTemporal = '';
        }, 2000);
      },
      error => {
        this.error = error.error.message
      }
    )
  }

  deleteFromServer() {
    if (!this.selectedGate)
      return
    this.creatingNewGate = false;
    this.qiskitService.deleteFromServer(this.selectedGate!).subscribe(
      ok => {
        this.customizedGates = this.customizedGates.filter(g => g.name !== this.selectedGate!.name);
        this.selectedGate = undefined;
        this.gateToDelete = undefined;
        this.showDeleteModal = false;
        this.mensajeTemporal = 'Gate deleted successfully';
        setTimeout(() => {
          this.mensajeTemporal = '';
        }, 2000);
      },
      error => {
        this.error = error.error.message
      }
    )
  }

  cancel() {
    this.selectedGate = undefined;
    this.mostrarModalCrear = false;
  }

  removeGate(qubit: number, column: number) {
    if (!this.circuit) return;

    const clickedGate = this.circuit.qubits[qubit].gates[column];
    if (!clickedGate || clickedGate.name === 'I' || (clickedGate.parentQubit !== undefined && clickedGate.name === '0')) return;

    const transactionId = (clickedGate as any).transactionId;

    if (!transactionId) {
      console.error("Clicked gate is missing the transaction ID.");
      return;
    }

    const gatesToRemove = this.gateRegistry.filter(r => r.transactionId === transactionId);

    if (gatesToRemove.length === 0) {
      console.error(`No records found for transaction ID: ${transactionId}.`);
      return;
    }

    for (const registration of gatesToRemove) {
      const { id, name, qubits } = registration;

      for (const q of qubits) {
        if (q >= 0 && q < this.circuit.qubits.length) {
          const gate = new EdGate('I', 1);
          gate.columnIndex = column;
          this.circuit.qubits[q].gates[column] = gate;
        }
      }

      console.log(`Eliminado grupo "${name}" (ID: ${id}) en qubits:`, qubits.sort((a, b) => a - b));
    }

    this.gateRegistry = this.gateRegistry.filter(r => r.transactionId !== transactionId);

    console.log(`¡Transacción ${transactionId} eliminada! Registros restantes:`, this.gateRegistry.length);
    this.saveState();
  }

  editGate(gate: EdGate) {
    this.selectedGate = Object.assign({}, gate);
    this.creatingNewGate = true;
  }

  copyCode() {
    let wholeCode = document.getElementById("codeArea")
    let range = document.createRange()
    range.selectNode(wholeCode!)
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    document.execCommand("copy")
    window.getSelection()!.removeAllRanges()
  }

  onTemplateChange(selected: CodeTemplate) {
    this.manager.selectedTemplate = this.manager.templates.find(t => t.fileName == selected.fileName) || new CodeTemplate("", "", "")
    this.saveState();
  }


  onSearchInput() {
    // Aquí no se hace nada porque el <datalist> ya lo hace
  }

  onTabPress(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      this.selectCOnfigIfMatch();
    }
  }

  onFocusInput() {

  }

  selectCOnfigIfMatch() {
    this.qubitsConfigurationService.getQubitConfigurationNames().subscribe(configNames => {
      const match = configNames.find(name => name.toLowerCase() === this.searchQuery.toLowerCase());
      if (match) {
        this.qubitsConfiguration = new QubitsConfiguration()

        if (!this.circuit) {
          this.circuit = new EdCircuit()
          this.circuit.columns = 10
          this.circuit.resizeTo(this.qubitsConfiguration.qubits)
        } else {
          this.circuit.resizeTo(this.qubitsConfiguration.qubits)
        }
      }
    });
  }

  clearSearch() {
    this.searchQuery = '';
  }

  searchTemplate() {
    const match = this.manager.templates.find(
      template => template.fileName.toLowerCase() === this.searchQuery.trim().toLowerCase()
    );

    if (match) {
      this.manager.selectedTemplate = match;
    } else {
      console.warn('No se encontró ningún template con ese nombre.');
    }
  }

  searchConfiguration() {
    this.qubitsConfigurationService.getQubitConfigurationNames().subscribe(configNames => {
      const match = configNames.find(name => name.toLowerCase() === this.searchQuery.toLowerCase());
      if (match) {
        this.selectedQubitsConfigurationName = match;
        this.onQubitsConfigurationChange(this.selectedQubitsConfigurationName);
        console.log("Qubit configuration changed. Clearing circuit and gate registry.");
        this.circuit = new EdCircuit();
        this.circuit.columns = 10;
        if (this.qubitsConfiguration) {
          this.circuit.resizeTo(this.qubitsConfiguration.qubits);
        }
        this.gateRegistry = [];
        this.saveState();
      } else {
        console.warn('No se encontró ninguna configuracion con ese nombre.');
      }
    });
  }

  showModalCode() {
    this.isEditingCode = false;
    this.modalCodigo = true;
    this.generateCode();
  }

  toggleEditCode() {
    this.isEditingCode = !this.isEditingCode;
  }

  get codeLinesCount(): number {
    if (!this.code) return 15;
    const lines = this.code.split('\n').length;
    return lines > 5 ? lines : 5;
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

  copiarCodigoGate() {
    const codigo = this.selectedGate?.code.toString() || '';
    navigator.clipboard.writeText(codigo).then(() => {
      this.mensajeTemporal2 = 'Code copied';
      setTimeout(() => {
        this.mensajeTemporal2 = '';
      }, 1000);
    }).catch(err => {
      console.error('Error al copiar el código:', err);
    });
  }

  gateExists(): boolean {
    if (this.defaultGates.some(dg => dg.name === this.selectedGate!.name)) return true;
    for (let i = 0; i < this.customizedGates.length; i++) {
      if (this.selectedGate!.name === this.customizedGates[i].name) {
        return true;
      }
    }
    return false;

  }

  gateQubitsInput(): boolean {
    if (this.selectedGate!.qubits <= 0) {
      return true;
    }
    return false;
  }

  gateDescriptionInput(): boolean {
    if (this.selectedGate!.description?.trim() === '') {
      return true;
    }
    return false;
  }

  codeInput() {
    if (this.selectedGate!.code?.trim() === '') {
      return true;
    }
    return false;
  }

  openDeleteModal(gate: any, index: number) {
    this.gateToDelete = gate;
    this.deleteIndex = index;
    this.showDeleteModal = true;
  }

  confirmDelete() {
    this.deleteFromServer();
    this.selectedGate = this.gateToDelete;
  }

  cancelDelete() {
    this.gateToDelete = undefined;
    this.showDeleteModal = false;
  }

  codeShowGates(gate: any) {
    this.selectedGate = gate;
    this.modalCodigoGate = true;
  }

  showMeasurementCodeGate() {
    const mGate = this.defaultGates.find(g => g.name === 'M');
    if (mGate) {
      this.selectedGate = mGate;
      this.selectedGate.description = 'Measure this qubit';
      //this.selectedGate.code = 'circuit.measure(' + (this.circuit ? this.circuit.qubits.length : 'qubits') + ', ' + (this.circuit ? this.circuit.qubits.length : 'qubits') + ')';
      this.selectedGate.code = 'circuit.measure(i, ' + (this.circuit ? this.circuit.qubits.length : 'qubits') + ' - i - 1)';
      this.modalCodigoGate = true;
    }
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
      if (this.code) {
        this.transpileService.transpile(this.code, backendsToTranspile, this.circuitName).subscribe(result => {
          this.transpiledCode = result;
        });
      }

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

  getAvailableQubits(column: number): number[] {
    if (!this.circuit) return [];

    const available: number[] = [];
    const qubitsLength = this.circuit.qubits.length;

    for (let i = 0; i < qubitsLength; i++) {
      const gate = this.circuit.qubits[i].gates[column];

      if (gate && gate.name === "I") {
        available.push(i);
      }
    }

    return available;
  }


  selectedColumn: number | null = null;

  openPlacementChoice(startQubit: number, column: number) {
    if (!this.selectedGate) return;

    if ((this.selectedGate as any).isDslGeneric) {
      this.currentStartQubit = startQubit;
      this.currentColumn = column;
      this.openDslGatePlacementModal(this.selectedGate);
      return;
    }

    if (this.selectedGate.qubits === 1) {
      this.placeGate(startQubit, column);
      return;
    }

    this.currentStartQubit = startQubit;
    this.currentColumn = column;
    this.showPlacementChoiceModal = true;
  }

  placeConsecutiveGate() {
    if (this.currentStartQubit === null || this.currentColumn === null || !this.selectedGate) return;

    const startQ = this.currentStartQubit;
    const col = this.currentColumn;

    console.log("Placing gate at qubit:", startQ, "column:", col);
    this.placeGate(startQ, col);

    this.showPlacementChoiceModal = false;
    this.currentStartQubit = null;
    this.currentColumn = null;
  }

  openQubitSelectionModal(column: number) {
    if (!this.selectedGate) return;

    this.pendingColumn = column;
    this.selectedQubitsForGate = [];

    this.showPlacementChoiceModal = false;
    this.showGatePlacementModal = true;
  }

  cancelChoice() {
    this.showPlacementChoiceModal = false;
    this.currentStartQubit = null;
    this.currentColumn = null;
  }

  isGridExpanded: boolean = false;

  toggleCircuitView() {
    this.isGridExpanded = !this.isGridExpanded;
  }


  showFloatingCircuit: boolean = false;

  floatingCircuitWidth: string = '1000px';
  floatingCircuitHeight: string = '600px';
  floatingCircuitTop: string = '50px';
  floatingCircuitLeft: string = '50px';


  openFloatingCircuit() {
    this.showFloatingCircuit = true;
  }

  closeFloatingCircuit() {
    this.showFloatingCircuit = false;
  }

  public baseZIndex: number = 1000;

  private currentMaxZIndex: number = this.baseZIndex;

  getNewZIndex(): number {
    this.currentMaxZIndex++;
    return this.currentMaxZIndex;
  }

  saveState() {
    if (this.circuit) {
      localStorage.setItem(this.LOCAL_STORAGE_KEYS.CIRCUIT, JSON.stringify(this.circuit));
    } else {
      localStorage.removeItem(this.LOCAL_STORAGE_KEYS.CIRCUIT);
    }

    if (this.selectedQubitsConfigurationName) {
      localStorage.setItem(this.LOCAL_STORAGE_KEYS.QUBITS_CONFIG_NAME, this.selectedQubitsConfigurationName);
    } else {
      localStorage.removeItem(this.LOCAL_STORAGE_KEYS.QUBITS_CONFIG_NAME);
    }

    localStorage.setItem(this.LOCAL_STORAGE_KEYS.GATE_REGISTRY, JSON.stringify(this.gateRegistry));

    if (this.manager.selectedTemplate) {
      localStorage.setItem(this.LOCAL_STORAGE_KEYS.SELECTED_TEMPLATE_FILENAME, this.manager.selectedTemplate.fileName);
    } else {
      localStorage.removeItem(this.LOCAL_STORAGE_KEYS.SELECTED_TEMPLATE_FILENAME);
    }

    this.checkForChanges();
  }



  openSaveProjectModal() {
    this.saveError = '';
    this.mostrarModalGuardarProyecto = true;
  }

  cancelarSaveModal() {
    this.mostrarModalGuardarProyecto = false;
    this.saveError = '';
    this.circuitName = '';
  }

  confirmarGuardarProyecto() {
    if (!this.circuitName || this.circuitName.trim().length === 0) {
      this.saveError = "The project name is mandatory.";
      return;
    }
    this.mostrarModalGuardarProyecto = false;
    this.guardarProyecto();
  }

  async guardarProyecto() {
    if (!this.circuit) return;

    let idCircuit: string;

    if (this.applyChanges === true) {
      idCircuit = this.selectedProjectId;
      this.applyChanges = false;
    } else {
      idCircuit = crypto.randomUUID();
    }

    try {
      this.mensajeTemporal2 = "Generating code and quirk...";
      await firstValueFrom(this.generateCode());
      this.mensajeTemporal2 = "";
    } catch (e) {
      console.error("Error generating code before save:", e);
      this.mensajeTemporal2 = "";
      alert("Error generating code before saving project.");
      return;
    }

    const gatesPayload = this.gateRegistry.map(g => ({
      id: g.id,
      column: g.column,
      name: g.name,
      qubits: g.qubits,
      parentQubit: g.parentQubit,
      transactionId: g.transactionId
    }));

    const generatorData = {
      "type": "EDITOR",
      "columns": this.circuit.columns,
      "gates": gatesPayload
    };

    const editorState = {
      columns: this.circuit.columns,
      qubitsCount: this.circuit.qubits.length,
      gateRegistry: this.gateRegistry,
      qubitsConfigName: this.selectedQubitsConfigurationName
    };

    const serializedState = JSON.stringify(editorState);
    const codeWithState = (this.code || "") + "\n\n# --- EDITOR_STATE_BEGIN ---\n# " + serializedState + "\n# --- EDITOR_STATE_END ---";

    const qubitsArray = Array.from({ length: this.circuit.qubits.length }, (_, i) => i);
    const qubitsString = qubitsArray.join(',');

    const qProgram: QProgram = {
      id: idCircuit,
      qubits: this.circuit.qubits.length,
      expressions: [],
      shots: 1024,
      generator: generatorData,
      qcodes: [{ platform: "AerSimulator", code: codeWithState }],
      qCircuit: {
        id: idCircuit,
        qbits: this.circuit.qubits.length,
        quirkCode: this.responseReceived?.QUIRK || { cols: [] }
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

    console.log('Objeto JSON a guardar (EDITOR):', JSON.stringify(finalPayload, null, 2));

    this.projectService.saveProject(finalPayload).subscribe({
      next: () => {
        this.selectedProjectId = idCircuit;
        this.lastSavedCircuitState = this.captureCircuitState();
        this.isCircuitModified = false;

        this.mensajeTemporal2 = `Project "${this.circuitName}" saved successfully!`;
        setTimeout(() => this.mensajeTemporal2 = '', 3000);
        this.loadProjectNames();
      },
      error: (err) => {
        console.error('Error saving project:', err);
        alert('Error saving project (Code 400). Check console.');
      }
    });
  }

  getAuthRequestBody(projectId?: string): any {
    const instanceId = window.crypto.randomUUID();
    const body: any = {
      email: this.userEmail,
      instanceId: instanceId
    };
    if (projectId) body.projectId = projectId;
    return body;
  }

  loadProjectNames() {
    if (this.userEmail) {
      this.projectService.getProjectsName(this.getAuthRequestBody()).subscribe({
        next: (data: ProjectListItem[]) => {
          this.projectList = data.filter(p => p.type === this.EDITOR_GENERATOR_FQCN);
          console.log("Editor projects loaded:", this.projectList);
        },
        error: (err) => console.error('Error loading projects:', err)
      });
    }
  }

  onProjectSelected() {
    if (!this.selectedProjectId) return;

    this.projectService.getProject(this.getAuthRequestBody(this.selectedProjectId)).subscribe({
      next: (project: StoredProject) => {
        this.mensajeTemporal2 = `Loading "${project.name}"...`;
        setTimeout(() => {
          this.mensajeTemporal2 = '';
          this.loadProjectDataToComponent(project);
          //location.reload();
        }, 1000);

      },
      error: (err) => {
        console.error('Error loading project:', err);
        alert('Error loading project details.');
      }
    });
  }

  loadProjectDataToComponent(project: StoredProject) {
    if (!project || !project.qProgram) {
      console.error("Invalid project structure: qProgram missing");
      return;
    }

    const qProgramAny = project.qProgram as any;
    const qcodesList = qProgramAny.QCodes || qProgramAny.qCodes || qProgramAny.qcodes || [];

    if (!qcodesList || qcodesList.length === 0) {
      console.error("Invalid project structure: No QCodes found");
      alert("Error: The loaded project has no code associated.");
      return;
    }

    this.circuitName = project.name;
    const fullCode = qcodesList[0].code;

    localStorage.setItem('selectedProjectId_editor', project.id);

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

    const stateRegex = /# --- EDITOR_STATE_BEGIN ---\n# (.*)\n# --- EDITOR_STATE_END ---/;
    const match = fullCode.match(stateRegex);

    if (match && match[1]) {
      try {
        const editorState = JSON.parse(match[1]);

        const stateToSave = JSON.stringify({
          columns: editorState.columns,
          qubitsCount: editorState.qubitsCount,
          gateRegistry: editorState.gateRegistry,
          qubitsConfigName: editorState.qubitsConfigName,
          selectedTemplateFileName: this.manager.selectedTemplate?.fileName,
          currentNotes: this.captureNotesState()
        });
        this.lastSavedCircuitState = stateToSave;
        this.isCircuitModified = false;

        if (editorState.qubitsConfigName) {
          this.qubitsConfigurationService.getQubitsConfiguration(editorState.qubitsConfigName).subscribe({
            next: (config) => {
              this.qubitsConfiguration = new QubitsConfiguration();
              this.qubitsConfiguration.name = config.name;
              this.qubitsConfiguration.matrix = config.matrix;
              this.qubitsConfiguration.qubits = config.qubits;

              this.selectedQubitsConfigurationName = config.name;

              this.circuit = new EdCircuit();
              this.circuit.name = this.circuitName;
              this.circuit.columns = editorState.columns || 10;

              this.circuit.resizeTo(editorState.qubitsCount);

              this.gateRegistry = editorState.gateRegistry || [];

              setTimeout(() => {
                this.restoreGatesFromRegistry();
              }, 100);

              this.code = fullCode.replace(stateRegex, '').trim();

              this.saveState();
              this.mensajeTemporal2 = `Project "${project.name}" loaded!`;
              setTimeout(() => this.mensajeTemporal2 = '', 2000);
            },
            error: (err) => {
              console.error("Error loading qubit config:", err);
              alert("Error loading qubit configuration for this project.");
            }
          });
        }
      } catch (e) {
        console.error("Error parsing editor state:", e);
        alert("Error restoring circuit state. The file might be corrupted.");
        this.code = fullCode;
      }
    } else {
      this.lastSavedCircuitState = '';
      this.isCircuitModified = true;

      this.code = fullCode;
      alert("Project loaded (Code only). Circuit layout could not be restored.");
    }
  }

  private captureCircuitState(): string {
    if (!this.circuit || !this.qubitsConfiguration) return '';

    const state = {
      columns: this.circuit.columns,
      qubitsCount: this.circuit.qubits.length,
      gateRegistry: this.gateRegistry,
      qubitsConfigName: this.selectedQubitsConfigurationName,
      selectedTemplateFileName: this.manager.selectedTemplate?.fileName,
      currentNotes: this.captureNotesState()
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

        if (this.qubitsConfiguration) {
          this.circuit = new EdCircuit()
          this.circuit.columns = 10
          this.circuit.resizeTo(this.qubitsConfiguration.qubits)
          this.gateRegistry = [];
          this.saveState();
        }
        localStorage.removeItem('selectedProjectId_editor');
        this.loadProjectNames();
      },
      error: (err: any) => {
        console.error('Error deleting project:', err);
        alert('Error deleting project. Check console.');
        this.showDeleteProjectModal = false;
      }
    });
  }

  applyChanges: boolean = false;

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

  openSaveAsNewModal() {
    this.saveError = '';
    //this.selectedProjectId = ''; 
    this.circuitName = this.circuitName || 'New Project';
    this.mostrarModalGuardarProyecto = true;
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

  toggleHelp() {
    this.showHelp = !this.showHelp;
  }

  // --- MÉTODOS QUANTUM COMPONENT DSL ---

  openDslFloatingHelp(tab: 'overview' | 'template' | 'dsl' | 'code' | 'metadata' = 'overview') {
    this.dslHelpActiveTab = tab;
    this.showDslFloatingHelp = true;
  }

  toggleDslFloatingHelp(tab: 'overview' | 'template' | 'dsl' | 'code' | 'metadata' = 'overview') {
    if (this.showDslFloatingHelp && this.dslHelpActiveTab === tab) {
      this.showDslFloatingHelp = false;
    } else {
      this.dslHelpActiveTab = tab;
      this.showDslFloatingHelp = true;
    }
  }

  closeDslFloatingHelp() {
    this.showDslFloatingHelp = false;
  }

  setDslHelpTab(tab: 'overview' | 'template' | 'dsl' | 'code' | 'metadata') {
    this.dslHelpActiveTab = tab;
  }

  toggleDslHelp(section: string) {
    this.toggleDslFloatingHelp(section as any);
  }

  isDslHelpOpen(section: string): boolean {
    return this.showDslFloatingHelp && this.dslHelpActiveTab === section;
  }

  closeDslHelp(section: string) {
    if (this.dslHelpActiveTab === section) {
      this.closeDslFloatingHelp();
    }
  }

  openDslModal() {
    this.mostrarModalDsl = true;
    if (!this.dslGateTemplates || this.dslGateTemplates.length === 0) {
      this.dslGateTemplates = this.dslService.gateTemplates;
    }
    if (!this.newDslGateCode) {
      this.onDslTemplateChange('diffuser');
    }
  }

  onDslTemplateChange(templateId: string) {
    this.selectedDslTemplateId = templateId;
    const template = this.dslService.gateTemplates.find(t => t.id === templateId);
    if (template) {
      this.newDslGateName = template.gateName;
      this.newDslGateDesc = template.description;
      this.newDslGateExpression = template.expression;
      this.regenerateDslGateCode();
    }
  }

  onDslNameChange() {
    if (this.newDslGateName && this.newDslGateExpression && this.newDslGateExpression.includes('=')) {
      const parts = this.newDslGateExpression.split('=');
      if (parts.length === 2) {
        this.newDslGateExpression = `${this.newDslGateName.trim()} = ${parts[1].trim()}`;
      }
    }
    this.regenerateDslGateCode();
  }

  onDslExpressionChange() {
    if (this.isSyncingDsl) return;
    this.isSyncingDsl = true;
    try {
      this.regenerateDslGateCode();
    } finally {
      this.isSyncingDsl = false;
    }
  }

  onDslCodeChange() {
    if (this.isSyncingDsl) return;
    this.isSyncingDsl = true;
    try {
      if (!this.newDslGateCode || !this.newDslGateCode.trim()) {
        this.newDslGateExpression = '';
        this.dslCompileError = '';
        return;
      }
      const decompiled = this.dslService.decompilePythonToDsl(this.newDslGateCode);
      if (decompiled && decompiled.expression) {
        this.newDslGateExpression = decompiled.expression;
        this.dslCompileError = '';
      }
      if (decompiled && decompiled.gateName && decompiled.gateName !== 'CustomGate' && decompiled.gateName !== '0') {
        this.newDslGateName = decompiled.gateName;
      }
    } catch (err: any) {
      // Ignorar errores transitorios mientras el usuario escribe en el código
    } finally {
      this.isSyncingDsl = false;
    }
  }

  insertDslToken(token: string) {
    if (!this.newDslGateExpression) {
      this.newDslGateExpression = '';
    }
    const trimmed = this.newDslGateExpression.trim();
    if (token !== ' · ' && trimmed && !trimmed.endsWith('·') && !trimmed.endsWith('=') && !trimmed.endsWith('[')) {
      this.newDslGateExpression += ' · ' + token;
    } else {
      this.newDslGateExpression += token;
    }
    this.onDslExpressionChange();
  }

  regenerateDslGateCode() {
    this.dslCompileError = '';
    try {
      if (!this.newDslGateExpression || !this.newDslGateExpression.trim()) {
        this.newDslGateCode = '';
        return;
      }
      this.newDslGateCode = this.dslService.generateGenericGateCode(
        this.newDslGateExpression,
        this.newDslGateName
      );
    } catch (err: any) {
      this.dslCompileError = err?.message || 'Syntax error in DSL expression';
    }
  }

  saveDslGenericGate() {
    if (!this.newDslGateName || !this.newDslGateName.trim()) {
      alert('Please provide a name for the gate.');
      return;
    }
    const cleanName = this.newDslGateName.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    const codeToSave = this.newDslGateCode && this.newDslGateCode.trim()
      ? this.newDslGateCode
      : this.dslService.generateGenericGateCode(this.newDslGateExpression, cleanName);

    const edGate = new EdGate(cleanName, 4);
    edGate.description = this.newDslGateDesc.trim() || `Generic quantum gate ${cleanName} (DSL)`;
    edGate.code = codeToSave;
    edGate.isGeneric = true;
    (edGate as any).isDslGeneric = true;
    (edGate as any).dslExpression = this.newDslGateExpression;
    (edGate as any).dslType = cleanName;

    // 1. Guardar en Base de Datos (backend)
    this.qiskitService.saveGate(edGate).subscribe({
      next: () => {
        this.mensajeTemporal = `Generic gate '${cleanName}' saved successfully to database.`;
        setTimeout(() => this.mensajeTemporal = '', 3500);
      },
      error: (err) => {
        console.warn('Backend save notice (guardada localmente):', err);
        this.mensajeTemporal = `Generic gate '${cleanName}' saved locally.`;
        setTimeout(() => this.mensajeTemporal = '', 3500);
      }
    });

    // 2. Registrar en lista de puertas genéricas de la paleta
    const existingIdx = this.dslGenericGates.findIndex(g => g.name === cleanName);
    if (existingIdx >= 0) {
      this.dslGenericGates[existingIdx] = edGate;
    } else {
      this.dslGenericGates.push(edGate);
    }

    // 3. Asegurar que las compuertas genéricas DSL NO se agreguen a las puertas de usuario
    this.customizedGates = this.customizedGates.filter(g => g.name !== cleanName && !this.isGenericDslGate(g));

    // 4. Persistir puertas genéricas personalizadas en localStorage
    this.saveCustomGenericGatesToStorage();

    // 5. Cerrar modal y auto-seleccionar la puerta guardada
    this.mostrarModalDsl = false;
    this.selectDslGenericGate(edGate);
  }

  loadCustomGenericGatesFromStorage() {
    try {
      const raw = localStorage.getItem(this.LOCAL_STORAGE_KEYS.CUSTOM_GENERIC_GATES);
      if (raw) {
        const storedGates: any[] = JSON.parse(raw);
        for (const sg of storedGates) {
          const cleanName = sg.name;
          const existing = this.dslGenericGates.find(g => g.name === cleanName);
          if (existing) {
            if (sg.dslExpression && !(existing as any).dslExpression) {
              (existing as any).dslExpression = sg.dslExpression;
            }
            continue;
          }
          const edGate = new EdGate(cleanName, sg.qubits || 4);
          edGate.description = sg.description || '';
          edGate.code = sg.code || '';
          edGate.isGeneric = true;
          (edGate as any).isDslGeneric = true;
          (edGate as any).dslExpression = sg.dslExpression;
          (edGate as any).dslType = cleanName;
          this.dslGenericGates.push(edGate);
        }
      }
      // Asegurar que ninguna compuerta genérica quede en customizedGates
      this.customizedGates = this.customizedGates.filter(g => !this.isGenericDslGate(g));
    } catch (e) {
      console.error('Error al cargar puertas genéricas desde storage', e);
    }
  }

  saveCustomGenericGatesToStorage() {
    try {
      const gatesToStore = this.dslGenericGates.map(g => ({
        name: g.name,
        qubits: g.qubits,
        description: g.description,
        code: g.code,
        isGeneric: true,
        isDslGeneric: true,
        dslExpression: (g as any).dslExpression
      }));
      localStorage.setItem(this.LOCAL_STORAGE_KEYS.CUSTOM_GENERIC_GATES, JSON.stringify(gatesToStore));
    } catch (e) {
      console.error('Error al guardar puertas genéricas en storage', e);
    }
  }

  // --- GESTIÓN DE COMPUERTAS GENÉRICAS DSL ---

  openDslGatesManagerModal() {
    this.dslGatesModal = true;
  }

  viewDslGateCode(gate: EdGate) {
    this.selectedGate = gate;
    this.modalCodigoGate = true;
  }

  editDslGate(gate: EdGate) {
    this.dslGatesModal = false;
    this.newDslGateName = gate.name || 'CustomGate';
    this.newDslGateDesc = gate.description || '';
    this.newDslGateCode = gate.code || '';
    const decompiled = this.dslService.decompilePythonToDsl(gate.code || '');
    this.newDslGateExpression = (gate as any).dslExpression || decompiled.expression || `${gate.name || 'CustomGate'} = `;
    this.dslCompileError = '';
    this.mostrarModalDsl = true;
  }

  openDeleteDslGateModal(gate: EdGate) {
    this.dslGateToDelete = gate;
    this.showDeleteDslGateModal = true;
  }

  confirmDeleteDslGate() {
    if (!this.dslGateToDelete) return;
    const gateName = this.dslGateToDelete.name || '';

    // 1. Quitar de dslGenericGates
    this.dslGenericGates = this.dslGenericGates.filter(g => g.name !== gateName);

    // 2. Quitar de customizedGates
    this.customizedGates = this.customizedGates.filter(g => g.name !== gateName);

    // 3. Persistir en localStorage
    this.saveCustomGenericGatesToStorage();

    // 4. Intentar eliminar en backend si existía allí
    this.qiskitService.deleteFromServer(this.dslGateToDelete).subscribe({
      next: () => {},
      error: (err) => console.warn('Aviso al eliminar en backend:', err)
    });

    if (this.selectedGate?.name === gateName) {
      this.selectedGate = undefined;
    }

    this.dslGateToDelete = undefined;
    this.showDeleteDslGateModal = false;
    this.mensajeTemporal = `Generic gate '${gateName}' deleted.`;
    setTimeout(() => this.mensajeTemporal = '', 2500);
  }

  cancelDeleteDslGate() {
    this.dslGateToDelete = undefined;
    this.showDeleteDslGateModal = false;
  }

  getGateDslExpression(gate: EdGate): string {
    if ((gate as any).dslExpression) {
      return (gate as any).dslExpression;
    }
    if (gate.code) {
      const decomp = this.dslService.decompilePythonToDsl(gate.code);
      if (decomp.expression) {
        return decomp.expression;
      }
    }
    return `${gate.name || 'Gate'}(n)`;
  }

  openDslModalWithPreset(presetId: string) {
    const preset = this.dslService.presets.find(p => p.id === presetId);
    if (preset) {
      this.selectDslPreset(preset);
    }
    this.openDslModal();
  }

  onDslPresetChangeById(presetId: string) {
    const preset = this.dslService.presets.find(p => p.id === presetId);
    if (preset) {
      this.selectDslPreset(preset);
    }
  }

  get selectedPresetDescription(): string {
    const preset = this.dslService.presets.find(p => p.id === this.selectedDslPresetId);
    return preset ? preset.description : '';
  }

  selectDslPreset(preset: DslPreset) {
    this.selectedDslPresetId = preset.id;
    this.dslExpression = preset.expression;
    this.dslExpansionMode = preset.defaultMode;
    this.dslQubits = preset.qubits;
    this.compileDslPreview();
  }

  compileDslPreview() {
    this.dslError = '';
    try {
      this.dslCompiledCircuit = this.dslService.compile(
        this.dslExpression,
        this.dslExpansionMode,
        this.dslQubits
      );
    } catch (err: any) {
      this.dslError = err?.message || 'Error de sintaxis en la expresión DSL';
      this.dslCompiledCircuit = undefined;
    }
  }

  applyDslToEditor() {
    if (!this.dslCompiledCircuit) return;

    const requiredQubits = this.dslCompiledCircuit.qubits;
    if (!this.qubitsConfiguration || this.qubitsConfiguration.qubits < requiredQubits) {
      this.qubitsConfiguration = new QubitsConfiguration();
      this.qubitsConfiguration.name = `${requiredQubits}_qubits_dsl`;
      this.qubitsConfiguration.qubits = requiredQubits;
      this.qubitsConfiguration.matrix = Array.from({ length: requiredQubits }, (_, i) => i);
      this.selectedQubitsConfigurationName = this.qubitsConfiguration.name;
    }

    if (!this.circuit) {
      this.circuit = new EdCircuit();
    }

    this.dslService.populateEdCircuit(this.dslCompiledCircuit, this.circuit, this.gateRegistry);
    this.circuitName = this.dslCompiledCircuit.name;
    this.isCircuitModified = true;
    this.saveState();

    this.mensajeTemporal = `¡Circuito '${this.dslCompiledCircuit.name}' generado desde DSL (${this.dslCompiledCircuit.columns} columnas)!`;
    setTimeout(() => {
      this.mensajeTemporal = '';
    }, 3500);

    this.mostrarModalDsl = false;
  }

  copiarDslCodigo() {
    if (!this.dslCompiledCircuit) return;
    const codeToCopy = this.dslActiveTab === 'qiskit_modular'
      ? this.dslCompiledCircuit.modularQiskitCode
      : this.dslCompiledCircuit.qiskitCode;
    navigator.clipboard.writeText(codeToCopy || '').then(() => {
      this.mensajeTemporal = '¡Código Qiskit copiado al portapapeles!';
      setTimeout(() => this.mensajeTemporal = '', 2000);
    });
  }



  selectDslGenericGate(gate: EdGate) {
    this.gateMselected = false;
    if (this.selectedGate === gate) {
      this.selectedGate = undefined;
      this.selectedGenericGateForPlacement = undefined;
    } else {
      this.selectedGate = gate;
      this.selectedGenericGateForPlacement = gate;
    }
  }

  get maxAvailableQubits(): number {
    if (!this.circuit || this.currentStartQubit === null) return 16;
    return this.circuit.qubits.length - this.currentStartQubit;
  }

  openDslGatePlacementModal(gate: EdGate) {
    this.selectedGenericGateForPlacement = gate;
    this.selectedDslGenericType = (gate as any).dslType || gate.name || 'Oracle';

    const totalQubits = this.circuit ? this.circuit.qubits.length : 4;
    const available = this.circuit ? (totalQubits - (this.currentStartQubit ?? 0)) : 4;
    this.dslPlacementQubits = Math.max(1, available > 0 ? available : totalQubits);
    this.dslPlacementValue = 2;
    this.dslPlacementAlpha = 'pi';
    this.dslPlacementTarget = Math.max(0, this.dslPlacementQubits - 1);
    this.dslPlacementOrder = '+';
    this.dslPlacementIterations = 2;
    this.dslPlacementSubValues = '2, 7';

    // Por defecto, sale de forma genérica con el nombre que tenga en el editor
    this.dslPlacementName = this.selectedDslGenericType;
    this.showDslPlacementModal = true;
  }

  updateDslPlacementName() {
    if (!this.dslPlacementName) {
      this.dslPlacementName = this.selectedDslGenericType;
    }
  }

  confirmDslGatePlacement() {
    if (this.currentStartQubit === null || this.currentColumn === null || !this.circuit) return;

    const mainQubit = this.currentStartQubit;
    const col = this.currentColumn;
    const n = Math.max(1, Number(this.dslPlacementQubits) || 1);

    // Si el circuito no tiene suficientes cúbits, ampliarlo
    if (mainQubit + n > this.circuit.qubits.length) {
      const requiredTotal = mainQubit + n;
      if (this.qubitsConfiguration) {
        this.qubitsConfiguration.qubits = requiredTotal;
        this.qubitsConfiguration.matrix = Array.from({ length: requiredTotal }, (_, i) => i);
      }
      this.circuit.resizeTo(requiredTotal);
    }

    // Verificar si los cúbits están libres en esta columna
    const selectedQubits: number[] = [];
    for (let i = 0; i < n; i++) {
      selectedQubits.push(mainQubit + i);
    }

    if (!this.areQubitsAvailable(selectedQubits, col)) {
      alert(`Cannot place '${this.dslPlacementName}' because one or more qubits in column ${col} are already occupied.`);
      return;
    }

    const newGateId = `T-${Date.now()}`;
    const uniqueGateId = `${newGateId}-${mainQubit}`;

    const gate = new EdGate(this.dslPlacementName || this.selectedDslGenericType, n);
    gate.columnIndex = col;
    gate.parentQubit = undefined;
    (gate as any).gateId = uniqueGateId;
    (gate as any).transactionId = newGateId;
    (gate as any).isDslGeneric = true;
    (gate as any).dslParams = {
      type: this.selectedDslGenericType,
      value: this.dslPlacementValue,
      target: this.dslPlacementTarget,
      order: this.dslPlacementOrder,
      phase: this.dslPlacementAlpha,
      iterations: this.dslPlacementIterations
    };

    let gateCode = '';
    if (this.selectedGenericGateForPlacement && (this.selectedGenericGateForPlacement as any).isCustomDsl && this.selectedGenericGateForPlacement.code) {
      gateCode = this.selectedGenericGateForPlacement.code;
    } else {
      gateCode = this.generateDslGateCode(this.selectedDslGenericType, n, this.dslPlacementName, (gate as any).dslParams);
    }

    gate.code = gateCode;
    gate.description = `${this.selectedDslGenericType} (${n} qubits)`;

    if (n > 1) {
      gate.targetQubits = selectedQubits.slice(1);
    } else {
      gate.targetQubits = undefined;
    }

    // Colocar la compuerta principal
    this.circuit.qubits[mainQubit].gates[col] = gate;

    // Colocar fillers en los cúbits secundarios
    for (let i = 1; i < selectedQubits.length; i++) {
      const q = selectedQubits[i];
      const filler = new EdGate('0', 1);
      filler.parentQubit = mainQubit;
      (filler as any).gateId = uniqueGateId;
      (filler as any).transactionId = newGateId;
      filler.columnIndex = col;
      this.circuit.qubits[q].gates[col] = filler;
    }

    // Registrar en gateRegistry
    this.gateRegistry.push({
      id: uniqueGateId,
      name: gate.name!,
      column: col,
      qubits: selectedQubits,
      parentQubit: mainQubit,
      transactionId: newGateId,
      dslParams: (gate as any).dslParams ? JSON.parse(JSON.stringify((gate as any).dslParams)) : undefined
    } as CircuitGate);

    this.isCircuitModified = true;
    this.saveState();

    this.showDslPlacementModal = false;
    this.selectedGate = undefined;
    this.mensajeTemporal = `Gate '${gate.name}' placed successfully at q${mainQubit} (${n} qubits)`;
    setTimeout(() => this.mensajeTemporal = '', 2500);
  }

  cancelDslPlacement() {
    this.showDslPlacementModal = false;
  }

  generateDslGateCode(type: string, n: number, gateName: string, params?: any): string {
    const rawName = (gateName || type).replace(/[^a-zA-Z0-9_]/g, '_');
    const fnName = rawName.startsWith('get') ? rawName : ('get' + (rawName === '0' ? 'Subcircuito_0' : rawName));
    const m = params?.value ?? this.dslPlacementValue ?? 2;
    const target = params?.target ?? this.dslPlacementTarget ?? (n - 1);
    const iterations = params?.iterations ?? this.dslPlacementIterations ?? 2;

    const dbGate = this.dslGenericGates.find(g => g.name === type || g.name === gateName || (type === '0' && (g.name === '0' || g.name === 'Subcircuito_0')));
    if (dbGate && dbGate.code && dbGate.code.trim()) {
      let code = dbGate.code;
      const existingFn = this.extractFunctionName(code);
      if (existingFn && existingFn !== fnName) {
        code = code.replace(new RegExp(`def\\s+${existingFn}\\b`), `def ${fnName}`);
      }
      code = code.replace(/def\s+([A-Za-z0-9_]+)\s*\(\s*n\s*=\s*\d+/g, `def $1(n = ${n}`);
      if (m !== undefined) {
        code = code.replace(/m\s*=\s*\d+/g, `m = ${m}`);
      }
      return code;
    }

    return `def ${fnName}(n = ${n}) : \n\tU = QuantumCircuit(n, name="${rawName}")\n\treturn U.to_gate()\n`;
  }
}

interface CircuitGate {
  id: string;
  name: string;
  column: number;
  qubits: number[];
  parentQubit: number;
  transactionId: string;
  dslParams?: any;
}