import { Component } from '@angular/core';
import { EdCircuit, EdGate } from './EdGate';
import { DeterministicService } from '../deterministic.service';
import * as jsonData from '../../assets/factorize667.json';

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

  customizedGates : EdGate[] = [];
  
  templates : any[] = []
  selectedTemplate? : any;
  showInstructions: any;

  measureFrom : number = 0;
  measureTo : number = this.circuit.qubits.length;
  existingCircuits : EdCircuit[] = [];

  f667 : any = jsonData

  constructor(private service : DeterministicService) {
    this.service.loadTemplates().subscribe(templates => {
      this.templates = templates
      this.selectedTemplate = this.templates[0]
    })
    let existingGates : any = localStorage.getItem('customizedGates');
    if (existingGates) {
      existingGates = JSON.parse(existingGates); 
      for (let i=0; i<existingGates.length; i++) {
        let gate = new EdGate(existingGates[i].name, existingGates[i].qubits);
        gate.description = existingGates[i].description;
        gate.code = existingGates[i].code;
        this.customizedGates.push(gate);
      }
    }

    let existingCircuits : any = localStorage.getItem('circuits');
    if (existingCircuits) {
      existingCircuits = JSON.parse(existingCircuits); 
      for (let i=0; i<existingCircuits.length; i++) {
        let circuit = Object.assign(new EdCircuit(), existingCircuits[i]);
        this.existingCircuits.push(circuit);
      }
    }
    this.f667 = this.f667[0]
    this.f667 = Object.assign(new EdCircuit(), this.f667)
    this.existingCircuits.push(this.f667)
  }

  generateCode() {
    if (!this.code) 
      this.code = this.selectedTemplate.code
    this.code = this.code?.replace("#QUBITS#", this.circuit.qubits.length.toString())
    this.code = this.code?.replace("#OUTPUT_QUBITS#", this.circuit.qubits.length.toString())

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
  }

  buildCode() {
    this.code = this.selectedTemplate.code
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
    if (startQubit + requiredQubits -1 > this.circuit.qubits.length) {
      console.warn("No hay suficientes qubits para colocar esta puerta aquí.");
      return;
    }
  
    // Coloca la puerta en todas las celdas correspondientes
    //for (let i = 0; i < requiredQubits; i++) {
    let gate = this.selectedGate.copy()
      this.circuit.setGate(startQubit, column, gate);
    //}
    this.selectedGate = undefined;
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
    if (this.selectedGate && !this.customizedGates.some(g => g.name === this.selectedGate!.name))
      this.customizedGates.push(this.selectedGate);
    this.creatingNewGate = false;
    localStorage.setItem('customizedGates', JSON.stringify(this.customizedGates));
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

  saveCircuit() {
    for (let i=0; i<this.existingCircuits.length; i++) {
      if (this.existingCircuits[i].name == this.circuit.name) {
        this.existingCircuits[i] = this.circuit;
        localStorage.setItem('circuits', JSON.stringify(this.existingCircuits));
        return;
      }
    }
    this.existingCircuits.push(this.circuit);
    localStorage.setItem('circuits', JSON.stringify(this.existingCircuits));
  }
    
  openCircuit(event : any) {
    let circuitName = event.target.value;
    for (let i=0; i<this.existingCircuits.length; i++) {
      if (this.existingCircuits[i].name == circuitName) {
        this.circuit = this.existingCircuits[i];
        break;
      }
    }
  }
}
