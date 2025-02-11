import { Component } from '@angular/core';
import { EdCircuit, EdGate } from './EdGate';
import * as jsonData from '../../assets/factorize667.json';
import { ManagerService } from '../manager.service';
import { CodeTemplate } from '../templates/CodeTemplate';
import { StoragesService } from '../storages.service';
import { QubitsConfiguration } from '../qubits-configuration/QubitConfiguration';

@Component({
  selector: 'app-quantum-editor',
  templateUrl: './quantum-editor.component.html',
  styleUrls: ['./quantum-editor.component.css'],
})
export class QuantumEditorComponent {
  circuit : EdCircuit = new EdCircuit();

  creatingNewGate: boolean = false;
  selectedGate?: EdGate;
  code? : string;

  showInstructions: any;

  measureFrom : number = 0;
  measureTo : number = this.circuit.qubits.length;

  qubitsConfiguration? : QubitsConfiguration

  f667 : any = jsonData

  constructor(public manager : ManagerService, public storages: StoragesService) {
    this.f667 = this.f667[0]
    this.f667 = Object.assign(new EdCircuit(), this.f667)
    this.storages.existingCircuits.push(this.f667)
  }

  onCircuitChange() {
    if (this.circuit) {
      this.storages.openCircuit(this.circuit);
      this.checkSizes()
    }
  }

  onQubitsConfigurationChange() {
    if (this.qubitsConfiguration) {
      this.storages.openQubitsConfiguration(this.qubitsConfiguration);
      this.checkSizes()
    }
  }

  private checkSizes() {
    if (this.qubitsConfiguration && this.qubitsConfiguration.qubits < this.circuit.qubits.length) {
      alert("The circuit is not big enough for the selected qubits configuration")
      this.qubitsConfiguration = undefined
    } else if (this.qubitsConfiguration && this.qubitsConfiguration.qubits > this.circuit.qubits.length) {
      this.circuit.resizeTo(this.qubitsConfiguration?.qubits)
    }
  }

  getPhysicalQubit(qubit: number) {
    if (!this.qubitsConfiguration)
      return qubit
    return this.qubitsConfiguration.matrix[qubit]
  }

  generateCode() {
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
        if (gate.name)
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
        let gate = this.circuit.getGate(j, i)
        if (!gate || gate.name=="I")
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
    this.circuit.columns++;
  }
  
  removeColumn() {
    if (this.circuit.columns > 1)
      this.circuit.columns--;
  }  

  placeGate(startQubit: number, column: number) {
    if (!this.selectedGate) return;

    if (this.selectedGate.name === 'M') {
      for (let i=this.measureFrom; i<this.measureTo; i++) 
        this.circuit.setGate(i, this.circuit.columns-1, this.selectedGate.copy());
      this.selectedGate = undefined;
      return;
    }
  
    const requiredQubits = this.selectedGate.qubits;
    if (startQubit + requiredQubits > this.circuit.qubits.length) {
      alert("Not enough qubits for this gate");
      return;
    }
  
    let gate = this.selectedGate.copy()
    this.circuit.setGate(startQubit, column, gate);
  }

  getGate(qubit: number, column: number): EdGate | null {
    return this.circuit.getGate(qubit, column);
  }

  selectGate(gate: EdGate) {
    if (this.selectedGate === gate) {
      this.selectedGate = undefined; // Deseleccionar si ya estaba seleccionada
    } else {
      this.selectedGate = gate;
    }
  }

  selectMeasurementGate() {
    this.selectedGate = new EdGate('M', 1);
    this.selectedGate.description = 'Measure this qubit';
    this.selectedGate.code = 'circuit.measure(' + this.circuit.qubits.length + ', ' + this.circuit.qubits.length + ')';
  }

  addQubit() {
    this.circuit.add();
    this.measureTo = this.circuit.qubits.length-1;
  }

  setQubits(event : any) {
    let qubits = parseInt(event.target.value) - this.circuit.qubits.length;
    if (qubits < this.circuit.qubits.length) 
      for (let i=0; i<-qubits; i++) 
        this.removeQubit()
    else 
      for (let i=0; i<qubits; i++) 
        this.addQubit()
  }

  removeQubit() {
    if (this.circuit.qubits.length > 2) { // Evita reducir por debajo del mínimo
      this.circuit.removeLast();
    }
  }  

  createCustomizedGate() {
    this.selectedGate = new EdGate('', 1);
    this.creatingNewGate = true;
  }

  addCustomizedGate() {
    this.creatingNewGate = false;
    this.storages.saveCustomizedGate(this.selectedGate!);
    this.selectedGate = undefined;
  }
  
  cancel() {
    this.selectedGate = undefined;
  }

  removeGate(qubit: number, column: number) {
    this.circuit.removeGate(qubit, column);
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
