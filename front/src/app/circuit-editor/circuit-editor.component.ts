import { Component } from '@angular/core';
import { EdCircuit, EdGate } from './EdCircuit';
import * as jsonData from '../../assets/factorize667.json';
import { ManagerService } from '../manager.service';
import { CodeTemplate } from '../templates/CodeTemplate';
import { QubitsConfiguration } from '../qubits-configuration/QubitConfiguration';
import { QiskitService } from '../qiskit.service';
import { QubitsConfigurationService } from '../qubits-configuration.service';
import { EdCircuitsService } from '../ed-circuits.service';

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

  constructor(public manager : ManagerService, private qiskitService : QiskitService, private qubitsConfigurationService: QubitsConfigurationService, private circuitsService : EdCircuitsService) {
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

  measureColumn(column : number)  {
    if (!this.circuit) 
      return
    let occupied = false
    for (let i=0; i<this.circuit.qubits.length; i++) {
      let gate = this.circuit.qubits[i].gates[column]
      if (gate.name!='I' && gate.name!='0') {
        occupied = true
        break
      }
    }
    if (occupied) {
      let option = confirm("There are gates in this column. Do you want to remove them?")
      if (!option)
        return
    }
    for (let i=0; i<this.circuit.qubits.length; i++) {
      let gate = new EdGate('M', 1)
      gate.columnIndex = column
      this.circuit.qubits[i].gates[column] = gate
    }
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

  onQubitsConfigurationChange(configurationName : string) {
    this.qubitsConfigurationService.getQubitsConfiguration(configurationName).subscribe(
      qubitsConfiguration => {
        this.qubitsConfiguration = new QubitsConfiguration()
        this.qubitsConfiguration.name = qubitsConfiguration.name
        this.qubitsConfiguration.matrix = qubitsConfiguration.matrix
        this.qubitsConfiguration.qubits = qubitsConfiguration.qubits

        if (!this.circuit) {
          this.circuit = new EdCircuit()
          this.circuit.columns = 10
          this.circuit.resizeTo(this.qubitsConfiguration.qubits)
        } else {
          this.circuit.resizeTo(this.qubitsConfiguration.qubits)
        }
      },
      error => { 
        this.error = error.error.message
      })
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
        if (gate.name=="I" || gate.name=="M")
          continue
        if (gate.name!='0' && gate.name)
          usedGates.set(gate.name, gate)
      }
    }

    let initialize = ""
    usedGates.forEach((gate) => {
      if (!gate.code)
        initialize += "#Gate with no name\n\n"
      else
       initialize += gate.code + "\n\n"
    })

    let calculus = ""
    for (let i=0; i<this.circuit.qubits.length; i++)
      calculus += "circuit.h(" + i + ")\n"
    
    let measures = ""
    for (let i=0; i<this.circuit.columns; i++) {
      for (let j=0; j<this.circuit.qubits.length; j++) {
        let gate = this.circuit.qubits[j].gates[i]
        if (!gate || gate.name=="I" || gate.name=="0")
          continue
        if (gate.name=="M") {
          measures += "circuit.measure(" + j + ", " + (this.circuit.qubits.length-j-1) + ")\n"
        } else {
          calculus += "circuit.append(" + gate.name + "(), ["
          for (let k=0; k<gate.qubits; k++) {          
            calculus += j + k
            if (k<gate.qubits-1)
              calculus += ", "
          }
          calculus += "])\n"
        }
      }
    }

    this.code = this.code?.replace("#INITIALIZE#", initialize)
    this.code = this.code?.replace("#CALCULUS#", calculus)
    this.code = this.code?.replace("#MEASURES#", measures)
    this.code = this.code?.replace("#SHOTS#", "1000")
  }

  addColumn() {
    this.circuit!.addColumn()
  }
  
  removeColumn() {
    this.circuit!.removeColumn()
  }  

  placeGate(startQubit: number, column: number) {
    if (!this.selectedGate || !this.qubitsConfiguration) 
      return;

    const requiredQubits = this.selectedGate.qubits;
    if (startQubit + requiredQubits > this.circuit!.qubits.length) {
      alert("Not enough qubits for this gate");
      return;
    }
  
    let gate = this.selectedGate.copy()
    this.circuit!.qubits[startQubit].gates[column] = gate;
    for (let i = 1; i < requiredQubits; i++)
      this.circuit!.qubits[startQubit + i].gates[column] = new EdGate('0', 1);
  }

  getGate(qubit: number, column: number): EdGate | null {
    if (!this.circuit) 
      return null;
    return this.circuit.qubits[qubit].gates[column]
  }

  selectGate(gate: EdGate) {
    if (this.selectedGate === gate) {
      this.selectedGate = undefined; // Deseleccionar si ya estaba seleccionada
    } else {
      this.selectedGate = gate;
    }
  }

  selectMeasurementGate() {
    if (!this.circuit)
      return;
    this.selectedGate = new EdGate('M', 1);
    this.selectedGate.description = 'Measure this qubit';
    this.selectedGate.code = 'circuit.measure(' + this.circuit.qubits.length + ', ' + this.circuit.qubits.length + ')';
  }

  createCustomizedGate() {
    this.selectedGate = new EdGate('', 1);
    this.creatingNewGate = true;
  }

  addCustomizedGate() {
    this.creatingNewGate = false;
    this.qiskitService.saveGate(this.selectedGate!).subscribe(
        ok=> {
          alert("Gate saved")
        },
        error => {
          this.error = error.error.message
        }
    )
    this.selectedGate = undefined;
  }
  
  cancel() {
    this.selectedGate = undefined;
  }

  removeGate(qubit: number, column: number) {
    if (!this.circuit) 
      return;
    let gate = this.circuit.qubits[qubit].gates[column]
    this.circuit.qubits[qubit].gates[column] = new EdGate('I', 1)
    for (let i=qubit+1; i<qubit+gate.qubits; i++) {
      this.circuit.qubits[i].gates[column] = new EdGate('I', 1)
    }
  }

  editGate(gate: EdGate) {
    this.selectedGate = Object.assign({}, gate); // Clonar para edición sin afectar la original
    this.creatingNewGate = true;
  }

  copyCode() {
    let wholeCode = document.getElementById("codeArea") 
    let range = document.createRange()
    range.selectNode(wholeCode!)
    window.getSelection()!.removeAllRanges(); // clear current selection
    window.getSelection()!.addRange(range); // to select text
    document.execCommand("copy")
    window.getSelection()!.removeAllRanges()
  }

  seeOrHideInstructions() {
    this.showInstructions = !this.showInstructions;
  }
   
  onTemplateChange(selected: CodeTemplate) {
    this.manager.selectedTemplate = this.manager.templates.find(t=> t.fileName==selected.fileName) || new CodeTemplate("", "", "")
  }
}
