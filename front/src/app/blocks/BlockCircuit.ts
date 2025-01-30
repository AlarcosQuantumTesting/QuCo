import { Gate } from "../common/Gate"
import { Block } from "./Block"
import { BlockColumn } from "./BlockColumn"

export class BlockCircuit {
    qubits : number
    numberOfStartColumns : number = 2
    startingColumns : BlockColumn[]

    numberOfBlocks : number = 4
    block : Block

    constructor(qubits : number) {
        this.qubits = qubits
        let column0 = new BlockColumn(this.qubits)
        column0.setGates(["X", "X", "X", "X", "X"])
        let column1 = new BlockColumn(this.qubits)
        column1.setGates(["H", "H", "H", "H", "H"])
        this.startingColumns = []
        this.startingColumns.push(column0)
        this.startingColumns.push(column1)
        this.block = new Block(qubits)
    }

    updateNumberOfQubits(qubits : number) {
        for (let i=0; i<this.startingColumns.length; i++)
            this.startingColumns[i].updateNumberOfQubits(qubits)
        this.block.updateNumberOfQubits(qubits) 
        this.qubits = qubits
    }

    setStartGate(qubitIndex: number, columnIndex : number, gate: Gate) {
       this.startingColumns[columnIndex].gates[qubitIndex] = gate
    }

    updateStartColumns() {
        if (this.numberOfStartColumns>this.startingColumns.length)
            this.startingColumns.push(new BlockColumn(this.qubits))
        else
            this.startingColumns.splice(this.startingColumns.length-1, 1)
        this.numberOfStartColumns = this.startingColumns.length
    }

    updateNumberOfBlocks(outputQubits : number) {
        let newNumber = Math.floor(Math.PI*Math.sqrt(this.qubits/outputQubits)-0.5)
        this.numberOfBlocks = newNumber
    }
}