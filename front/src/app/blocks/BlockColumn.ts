import { Gate } from "../common/Gate"

export class BlockColumn {
    gates : Gate[] = []

    constructor(qubits : number, index? : number) {
        for (let i=0; i<qubits; i++) {
            if (typeof index === "number" && index % 2 === 0)
                this.gates.push(new Gate("X", false, 1))
            else
                this.gates.push(new Gate("H", false, 1))
        }
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
        for (let i=0; i<names.length; i++) {
           this.gates.push(new Gate(names[i], true, 1))
        }
    }

    setGate(qubit : number, name : string) {
        this.gates[qubit] = new Gate(name, true, 1)
    }
}