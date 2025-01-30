import { BlockColumn } from "./BlockColumn";

export class Block {
    numberOfLeftColumns : number = 1
    leftColumns : BlockColumn[] = []

    numberOfRightColumns : number = 1
    rightColumns : BlockColumn[] = []

    constructor(qubits : number) {
        this.leftColumns.push(new BlockColumn(qubits))
        this.rightColumns.push(new BlockColumn(qubits))
    }

    updateNumberOfQubits(qubits : number) {
        for (let i=0; i<this.leftColumns.length; i++)
            this.leftColumns[i].updateNumberOfQubits(qubits)
        for (let i=0; i<this.rightColumns.length; i++)
            this.rightColumns[i].updateNumberOfQubits(qubits)
    }

    updateColumns(side: string, qubits : number) {
        let originalLength
        if (side=='left')  {
            originalLength = this.numberOfLeftColumns
            if (this.numberOfLeftColumns>this.leftColumns.length)
                this.leftColumns.push(new BlockColumn(qubits, originalLength))
            else
                this.leftColumns.splice(this.leftColumns.length-1, 1)
        } else {
            originalLength = this.numberOfRightColumns
            if (this.numberOfRightColumns>this.rightColumns.length)
                this.rightColumns.push(new BlockColumn(qubits, originalLength))
            else
                this.rightColumns.splice(this.rightColumns.length-1, 1)
        }
    }
}