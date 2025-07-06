import { Gate } from "../common/Gate"
import { Block } from "./Block"
import { BlockColumn } from "./BlockColumn"

export class BlockCircuit {
    qubits : number
    numberOfStartColumns : number = 2
    startingColumns : BlockColumn[]

    numberOfBlocks : number = 4
    //block!: Block
    block: Block

    constructor(qubits : number) {
        this.qubits = qubits
        let column0 = new BlockColumn(this.qubits)
        column0.setGates(["X", "X", "X", "X", "X"])
        let column1 = new BlockColumn(this.qubits)
        column1.setGates(["H", "H", "H", "H", "H"])
        //let column2 = new BlockColumn(this.qubits)
        //column2.setGates(["RX", "RX", "RX", "RX", "RX"])
        this.startingColumns = []
        this.startingColumns.push(column0)
        this.startingColumns.push(column1)
        //this.startingColumns.push(column2)
        this.block = new Block(qubits)
    }

         /*for (let i=0; i<numberOfStartColumns; i++) {
            let column = new BlockColumn(this.qubits, i)
            this.startingColumns.push(column)
            this.block = new Block(qubits)
        }*/
    /*constructor(qubits : number, numberOfStartColumns : number) {
        this.qubits = qubits
        this.startingColumns = []
       
        let column0 = new BlockColumn(this.qubits)
        let column1 = new BlockColumn(this.qubits)
        this.startingColumns.push(column0)
        this.startingColumns.push(column1)
        this.block = new Block(qubits)
        
    }*/

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
            this.startingColumns.push(new BlockColumn(this.qubits, this.startingColumns.length))
        else
            this.startingColumns.splice(this.startingColumns.length-1, 1)
        this.numberOfStartColumns = this.startingColumns.length
    }

    /*updateStartColumns() {
        while (this.startingColumns.length < this.numberOfStartColumns) {
            const index = this.startingColumns.length;
            const newColumn = new BlockColumn(this.qubits);

            if (index === 0) {
                newColumn.setGates(new Array(this.qubits).fill("X"));
            } else if (index === 1) {
                newColumn.setGates(new Array(this.qubits).fill("H"));
            } else if (index === 2) {
                newColumn.setGates(new Array(this.qubits).fill("RX"));
            } else {
                newColumn.setGates(new Array(this.qubits).fill("H"));
            }

            this.startingColumns.push(newColumn);
        }

        while (this.startingColumns.length > this.numberOfStartColumns) {
            this.startingColumns.pop();
        }

        this.numberOfStartColumns = this.startingColumns.length;
    }*/


    updateNumberOfBlocks(outputQubits : number) {
        let newNumber = Math.floor(Math.PI*Math.sqrt(this.qubits/outputQubits)-0.5)
        this.numberOfBlocks = newNumber
    }
}