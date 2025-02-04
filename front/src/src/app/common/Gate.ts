export class Gate {
    name? : string
    selected? : boolean
    affectedQubits : number

    constructor(name : string, selected : boolean, affectedQubits : number) {
        this.name = name
        this.selected = selected
        this.affectedQubits = affectedQubits
    }
}