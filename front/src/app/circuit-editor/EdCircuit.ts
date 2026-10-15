export class EdCircuit {
    name : string = "";
    qubits: EdQubit[] = [];
    columns: number = 5;

    constructor() { }

    resizeTo(qubits: number) {
        if (qubits < this.qubits.length) {
            this.qubits = this.qubits.slice(0, qubits);
        } else {
            for (let i = this.qubits.length; i < qubits; i++) {
                this.qubits.push(new EdQubit());
                for (let j = 0; j < this.columns; j++) {
                    const gate = new EdGate('I', 1);
                    gate.columnIndex = j;
                    this.qubits[i].add(gate);
                }
            }
        }
    }  

    addColumn() {
        this.columns++;
        for (let i = 0; i < this.qubits.length; i++) {
            const gate = new EdGate('I', 1);
            gate.columnIndex = this.columns - 1;
            this.qubits[i].add(gate);
        }
    }

    removeColumn() {
        this.columns--;
        for (let i = 0; i < this.qubits.length; i++) {
            this.qubits[i].removeGate(this.columns);
        }
    }

}

export class EdQubit {
    gates : EdGate[] = []

    add(gate: EdGate) {
        if (!this.gates.includes(gate))
            this.gates.push(gate)

        this.gates.sort((a, b) => a.columnIndex! - b.columnIndex!)
    }

    /*setGate(column: number, gate: EdGate) {
        let index = this.gates.findIndex(gate => gate.columnIndex === column)
        if (index === -1) {
            gate.columnIndex = column
            this.gates.push(gate)
        } else {
            this.gates[index] = gate
        }
        this.gates.sort((a, b) => a.columnIndex! - b.columnIndex!)
    }*/

    removeGate(column: number) {
        this.gates = this.gates.slice().filter(gate => gate.columnIndex !== column);
    }
}

export class EdGate {
    name?: string;
    qubits: number = 1;
    columnIndex? : number
    code: string = ''; 
    description: string = ''; 
    targetQubits?: number[];
    parentQubit?: number;

    constructor(name: string, qubits: number) {
        if (!name) 
            name = "XX"
        this.name = name;
        this.code = "def " + name + "() : \n"
            + "\tU = QuantumCircuit(" + qubits + ")\n" +
            "\t# Add code here\n" + 
            "\treturn U.to_gate()\n";
        this.qubits = qubits;
    }


    copy(): EdGate {
        const gateCopy = new EdGate(this.name!, this.qubits);

        gateCopy.targetQubits = this.targetQubits ? [...this.targetQubits] : undefined;
        gateCopy.parentQubit = this.parentQubit;

        return gateCopy;
    }
}