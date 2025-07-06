import { Gate } from "../common/Gate"

export class BlockColumn {
    gates : Gate[] = []

    constructor(qubits : number, index? : number) {
         for (let i=0; i<qubits; i++)
            if (!index || index%2==1)
                this.gates.push(new Gate("X", false, 1))
            else
                this.gates.push(new Gate("H", false, 1))
        this.setGates(new Array(qubits).fill("H"))
        /*console.log("Creating BlockColumn with " + qubits + " qubits and index " + index)
        for (let i=0; i<qubits; i++)
            //if (!index || index%2===1)
            if (!index) {
                console.log("Adding gate H to qubit " + i)
                this.gates.push(new Gate("H", false, 1))
            } else {
                console.log("else Adding gate H to qubit " + i)
                this.gates.push(new Gate("H", false, 1))
            }*/
    }

    updateNumberOfQubits(qubits : number) {
        if (qubits<this.gates.length)
            this.gates.splice(this.gates.length-1, 1)
        else if (qubits>this.gates.length) {
            this.gates.push(new Gate("H", false, 1))
        }
    }

    setGates(names : string[]) {
        this.gates = []
        for (let i=0; i<names.length; i++)
           this.gates.push(new Gate(names[i], true, 1))
    }

    setGate(qubit : number, name : string) {
        this.gates[qubit] = new Gate(name, true, 1)
    }
}