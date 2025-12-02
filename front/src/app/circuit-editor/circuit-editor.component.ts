import { Component } from '@angular/core';
import { EdCircuit, EdGate } from './EdCircuit';
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
  code? : string;
  error? : any

  showInstructions: any;

  selectedCircuitName : string | null = null
  circuit? : EdCircuit 
  circuitNames : string[] = []

  selectedQubitsConfigurationName : string | null = null
  qubitsConfiguration? : QubitsConfiguration
  existingConfigurationNames : string[] = []

  f667 : any = jsonData

  Math : any = Math

  customizedGates : EdGate[] = [];

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

  projectList: ProjectListItem[] = []; 
  selectedProjectId: string = '';

  mostrarModalGuardarProyecto: boolean = false;
  saveError: string = '';
  
  userEmail: string = localStorage.getItem('userEmail') || '';
  userToken: string = localStorage.getItem('userToken') || '';

  EDITOR_GENERATOR_FQCN = 'edu.uclm.reper.model.Editor'; 
  REQUIRED_GENERATOR_TYPE = this.EDITOR_GENERATOR_FQCN;

  responseReceived? : any
  mostrarNotasModal: boolean = false;
  nombreComponente: string = 'Editor';
  tipoLocal: string = 'quco_editor';

  storedNotesStr = localStorage.getItem('project_notes');

  isCircuitModified: boolean = false;
  private lastSavedCircuitState: string = '';

  showDeleteProjectModal: boolean = false;
  showApplyChangesModal: boolean = false;

  private readonly LOCAL_STORAGE_KEYS = {
    CIRCUIT: 'circuitEditorCircuit',
    QUBITS_CONFIG_NAME: 'circuitEditorQubitsConfigName',
    GATE_REGISTRY: 'circuitEditorGateRegistry',
    SELECTED_TEMPLATE_FILENAME: 'circuitEditorTemplateFileName'
  };

  constructor(public manager : ManagerService, private qiskitService : QiskitService, private qubitsConfigurationService: QubitsConfigurationService, 
    private circuitsService : EdCircuitsService, public transpileService: TranspileService, private projectService: ProjectService) {
    this.qiskitService.getCustomizedGates().subscribe(
      gates => {
        for (let i=0; i<gates.length; i++) {
          let edGate = new EdGate(gates[i].name, gates[i].qubits)
          edGate.description = gates[i].description
          edGate.code = gates[i].code
          this.customizedGates.push(edGate)
        }
      },
      error => {
        this.error = error.error.message
      })

      this.qubitsConfigurationService.getQubitConfigurationNames().subscribe(
        qubitsConfiguration => {
          this.existingConfigurationNames = qubitsConfiguration
      })

      this.circuitsService.getCircuitNames().subscribe(
        circuits => {
          this.circuitNames = circuits  
        })

  }

  ngOnInit() {

    this.transpileService.getBackends().subscribe(backends => {
      this.availableBackends = backends;
    });
    
    console.log("Notas:", this.storedNotesStr);
    
    this.selectedBackends = JSON.parse(localStorage.getItem('selectedBackends') || '[]');
    this.availableBackends = JSON.parse(localStorage.getItem('availableBackends') || '[]');

    this.manager.selectedTemplate = this.manager.templates[0];

      const savedTemplateFileName = localStorage.getItem(this.LOCAL_STORAGE_KEYS.SELECTED_TEMPLATE_FILENAME);
      if (savedTemplateFileName) {
        this.manager.selectedTemplate = this.manager.templates.find(t => t.fileName === savedTemplateFileName) || this.manager.templates[0];
      } else {
        this.manager.selectedTemplate = this.manager.templates[0];
      }


      const savedRegistry = localStorage.getItem(this.LOCAL_STORAGE_KEYS.GATE_REGISTRY);
      if (savedRegistry) {
        this.gateRegistry = JSON.parse(savedRegistry);
      }


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

      const savedProjectId = localStorage.getItem('selectedProjectId_editor');
      if (savedProjectId && this.userEmail && this.userToken) {
          this.selectedProjectId = savedProjectId;
          this.onProjectSelected();
      }
    
      this.loadProjectNames();
  }

  measureColumn(column : number) {
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
        for (let i = 0; i < this.circuit.qubits.length; i++) 
            this.circuit.qubits[i].gates[column] = new EdGate('I', 1);
        
        this.gateRegistry = this.gateRegistry.filter(r => r.column !== column);
        this.saveState();
        return;
    }

    if (occupied) {
        let option = confirm("This column has other gates. Do you want to continue anyway?");
        if (!option)
            return;
    }
    
    for (let i = 0; i < this.circuit.qubits.length; i++) 
        this.circuit.qubits[i].gates[column] = new EdGate('I', 1);

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

  saveCircuit(circuit : EdCircuit) {
    this.circuitsService.saveCircuit(circuit).subscribe(
      response => {
        alert("Circuit saved")
      }, 
      error => { 
        this.error = error.error.message
      })
  }

  onCircuitChange(circuitName : string) {
    this.circuitsService.getCircuit(circuitName).subscribe(
      circuit => {
        if (circuit.qubits.length>this.qubitsConfiguration!.qubits) {
          alert("The selected qubits configuration has less qubits than the circuit")
          return
        }
        this.circuit = new EdCircuit()
        this.circuit.name = circuit.name
        for (let i=0; i<circuit.qubits.length; i++) {
          let qubit = circuit.qubits[i]
          for (let j=0; j<qubit.gates.length; j++) {
            let gate : EdGate = qubit.gates[j]
            this.circuit.qubits[i].gates[j] = gate
          }
        }
      },
      error => {
        this.error = error.error.message
      }
    )
  }
  
  onQubitsConfigurationChange(configurationName : string, isLoadingFromStorage: boolean = false) {
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
                  
                  loadedCircuit.qubits = loadedCircuitData.qubits.map((qubitData: { gates: any[]; }) => ({
                      ...qubitData,
                      gates: qubitData.gates.map((gateData: any) => {
                          const gate = new EdGate(gateData.name, gateData.qubits);
                          Object.assign(gate, gateData);
                          return gate;
                      })
                  }));
                  
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
            this.circuit.qubits[i].gates[j] = new EdGate('I', 1);
        }
    }
    
    this.gateRegistry.forEach(registration => {
        const { name, column, qubits, parentQubit, transactionId } = registration;

        if (column >= this.circuit!.columns) return;
        
        if (parentQubit === qubits[0]) {
            const gateData = this.customizedGates.find(g => g.name === name) || new EdGate(name, qubits.length);
            const gate = gateData.copy(); 

            gate.qubits = qubits.length;
            (gate as any).gateId = registration.id;
            (gate as any).transactionId = transactionId;
            gate.targetQubits = qubits.slice(1); 
            gate.parentQubit = undefined; 

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

  generateCode() {
    if (!this.circuit) 
      return

    this.code = this.manager.selectedTemplate.code
    this.code = this.code?.replace("#QUBITS#", this.circuit.qubits.length.toString())
    this.code = this.code?.replace("#OUTPUT_QUBITS#", this.circuit.qubits.length.toString())

    if (this.qubitsConfiguration) {
      this.code = this.code?.replace("#QUBITS_LAYOUT#", this.qubitsConfiguration.matrix.join(", "))
    } else {
      this.code = this.code?.replace(", initial_layout=[#QUBITS_LAYOUT#])", ")")
    }

    let usedGates = new Map<string, EdGate>()

    for (let i=0; i<this.circuit.qubits.length; i++) {
      let qubit = this.circuit.qubits[i]
      for (let j=0; j<qubit.gates.length; j++) {
        let gate = qubit.gates[j]
        if (gate?.name && gate.name !== "I" && gate.name !== "M" && gate.name !== "0") {
          usedGates.set(gate.name, gate)
        }
      }
    }

    let initialize = "";
    usedGates.forEach((gate) => {
      const matchingGate = this.customizedGates?.find(g => g.name === gate.name);

      if (matchingGate && matchingGate.code) {
        initialize += matchingGate.code + "\n\n";
      } else if (gate.code) {
        initialize += gate.code + "\n\n";
      } else {
        initialize += `# Error loading gate ${gate.name}\n\n`;
      }
    });

    let calculus = ""
    for (let i=0; i<this.circuit.qubits.length; i++)
      calculus += "circuit.h(" + i + ")\n"

    let measures = ""
    for (let i=0; i<this.circuit.columns; i++) {
      for (let j=0; j<this.circuit.qubits.length; j++) {
        let gate = this.circuit.qubits[j].gates[i]
        if (!gate || gate.name=="I" || gate.name=="0" || !gate.name)
          continue
        if (gate.name=="M") {
          measures += "circuit.measure(" + j + ", " + (this.circuit.qubits.length-j-1) + ")\n"
        }
      }
    }

    const consolidatedQubitSets = new Map<string, Set<number>>();

    const sortedRegistry = [...this.gateRegistry].sort((a, b) => {
        if (a.column !== b.column) {
            return a.column - b.column;
        }
        return a.parentQubit - b.parentQubit;
    });

    sortedRegistry.forEach(registration => {
        const key = `${registration.transactionId}_${registration.name}`;
        
        if (!consolidatedQubitSets.has(key)) {
            consolidatedQubitSets.set(key, new Set<number>());
        }
        
        const currentSet = consolidatedQubitSets.get(key)!;
        registration.qubits.forEach(q => currentSet.add(q));
    });

    // Generar el código de append
    consolidatedQubitSets.forEach((qubitsSet, key) => {
        const gateName = key.split('_')[1]; 

        const sortedQubits = Array.from(qubitsSet).sort((a, b) => a - b);
        const qubitsList = sortedQubits.join(', '); 
        console.log("GateName: ", gateName);
        if (gateName === "M") {
          calculus += `circuit.measure(${gateName}(), [${qubitsList}])\n`;
        } else {
          calculus += `circuit.append(${gateName}(), [${qubitsList}])\n`;
        }
        
    });

    this.code = this.code?.replace("#INITIALIZE#", initialize)
    this.code = this.code?.replace("#CALCULUS#", calculus)
    this.code = this.code?.replace("#MEASURES#", measures)
    this.code = this.code?.replace("#SHOTS#", "1000")
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

    
    for (let i = 1; i < selectedQubits.length; i++) {
        const q = selectedQubits[i];
        const filler = new EdGate('0', 1);
        filler.parentQubit = mainQubit; 
        (filler as any).gateId = uniqueGateId;
        (filler as any).transactionId = newGateId;
        
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

      for (let i = 1; i < group.length; i++) {
          const q = group[i];
          const filler = new EdGate('0', 1);
          filler.parentQubit = mainQubit;
          (filler as any).gateId = uniqueGateId; 
          (filler as any).transactionId = transactionId;
          
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
    if (this.gateMselected) {
      this.gateMselected = false;
      this.selectedGate = undefined;
    } else {
      this.selectedGate = new EdGate('M', 1);
      this.gateMselected = true;
      this.selectedGate.description = 'Measure this qubit';
      this.selectedGate.code = 'circuit.measure(' + this.circuit.qubits.length + ', ' + this.circuit.qubits.length + ')';
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
        ok=> {
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
        ok=> {
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
    if (!clickedGate || clickedGate.name === 'I' || clickedGate.name === '0') return;

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
                this.circuit.qubits[q].gates[column] = new EdGate('I', 1); 
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

  seeOrHideInstructions() {
    this.showInstructions = !this.showInstructions;
  }
   
  onTemplateChange(selected: CodeTemplate) {
    this.manager.selectedTemplate = this.manager.templates.find(t=> t.fileName==selected.fileName) || new CodeTemplate("", "", "")
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
    this.modalCodigo = true;
    this.generateCode();
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
    for (let i=0; i < this.customizedGates.length; i++) {
      if (this.selectedGate!.name === this.customizedGates[i].name){
        return true;
      }
    }
    return false;
    
  }

  gateQubitsInput(): boolean {
    if (this.selectedGate!.qubits <= 0){
      return true;
    }
    return false;
  }

  gateDescriptionInput(): boolean {
    if (this.selectedGate!.description?.trim() === ''){
      return true;
    }
    return false;
  }

  codeInput() {
    if (this.selectedGate!.code?.trim() === ''){
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

  guardarProyecto() {
    if (!this.circuit) return;

    let idCircuit: string;

    if (this.applyChanges === true) {
      idCircuit = this.selectedProjectId;
      this.applyChanges = false;
    } else {
      idCircuit = crypto.randomUUID();
    }

    this.generateCode();

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

    const qubitsArray = Array.from({length: this.circuit.qubits.length}, (_, i) => i);
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
        token: this.userToken,
        instanceId: instanceId
    };
    if (projectId) body.projectId = projectId;
    return body;
  }

  loadProjectNames() {
    if (this.userEmail && this.userToken) {
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
    const qcodesList = qProgramAny.QCodes || qProgramAny.qcodes || [];

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
}

interface CircuitGate {
    id: string;
    name: string;
    column: number;
    qubits: number[];
    parentQubit: number;
    transactionId: string;
}