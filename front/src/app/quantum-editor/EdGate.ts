export class EdCircuit {
    name : string = "";
    qubits: EdQubit[] = [];
    columns: number;

    constructor() {
        this.qubits = [new EdQubit(), new EdQubit()];
        this.columns = 5
    }

    resizeTo(qubits: number) {
        if (qubits < this.qubits.length) {
            this.qubits = this.qubits.slice(0, qubits);
        } else {
            for (let i = this.qubits.length; i < qubits; i++) {
                this.qubits.push(new EdQubit());
                for (let j = 0; j < this.columns; j++) {
                    this.qubits[i].add(new EdGate('I', 1));
                }
            }
        }
    }  

    add() {
        this.qubits.push(new EdQubit());
        for (let i=0; i<this.columns; i++)
            this.qubits[this.qubits.length-1].add(new EdGate('I', 1))
    }

    getGate(qubit: number, column: number): EdGate | null {
        return this.qubits[qubit].gates.find(gate => gate.x === column) || null;
    }

    setGate(qubit: number, column: number, selectedGate: EdGate) {
        selectedGate.x = column; // Establecer la posición en la columna
        this.qubits[qubit].add(selectedGate);
    }

    removeLast() {
        this.qubits.pop();
    }

    isCovered(qubit: number, column: number): boolean {
        for (let i = 0; i < this.qubits.length; i++) {
            const gate = this.getGate(i, column);
            if (gate && i < qubit && i + gate.qubits > qubit) {
                return true;
            }
        }
        return false;
    }

    removeGate(qubit: number, column: number) { 
        this.qubits[qubit].removeGate(column);
    }
}

export class EdQubit {
    gates: EdGate[] = []

    add(gate: EdGate) {
        if (!this.gates.includes(gate))
            this.gates.push(gate)

        this.gates.sort((a, b) => a.x! - b.x!)
    }

    removeGate(column: number) {
        this.gates = this.gates.slice().filter(gate => gate.x !== column);
    }
}

export class EdGate {
    name?: string;
    qubits: number = 1;
    x: number = -1;
    y: number = -1;
    code: string = ''; // Texto asociado
    description: string = ''; // Descripción de la puerta

    constructor(name: string, qubits: number) {
        if (!name) 
            name = "XXX"
        this.name = name;
        this.code = "def " + name + "() : \n"
            + "\tU = QuantumCircuit(" + qubits + ")\n" +
            "\t# Add code here\n" + 
            "\treturn U.to_gate()\n";
        this.qubits = qubits;
    }

    copy(): EdGate {
        let result = new EdGate(this.name!, this.qubits);
        result.code = this.code;
        result.description = this.description;
        return result;
    }
}