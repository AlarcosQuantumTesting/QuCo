import { GroverService } from "../grover.service"
import { QiskitCode } from "../grover/QiskitCode"
import { QiskitService } from "../qiskit.service"

export abstract class GroverStyle {
    qubits: number = 4
    hideExamples: boolean = true
    error?: any
    finalMatrix?: any[]
    finalMatrixNumberOfRows: number = 0
    dataReceived: boolean = false
    numberOfReceivedMatrixes: number = 0
    qiskitCode : QiskitCode = new QiskitCode()
    calculusTime?: number
    qiskitMatrixStart: string = ""
    qiskitMatrixEnd: string = ""
    selectedElements: number = 0
    matrix?: any[]

    userExpressions: string[] = []
    currentUserExpression: string = ""

    javaExamples: any[] = [
        {
            exprs: ["q2==1"],
            explanation: "selects those rows whose third qubit (i.e., q2) is 1"
        },
        {
            exprs: ["input%2==0"],
            explanation: "selects those rows corresponding to even numbers"
        },
        {
            exprs: ["(q0==1 && q2==1)"],
            explanation: "selects the rows whose qubits q0 and q1 are 1"
        },
        {
            exprs: ["dv(0..1) == dv(2..4)"],
            explanation: "selects the rows whose decimal value of qubits q0 and q1 is equals to the decimal value of qubits q2, q3 and q4"
        },
        {
            exprs: ["input <= 1 ? false : !Array.from(new Array(input), (el, i) => i + 1).filter(x => x > 1 && x < input).find(x => input % x === 0)"],
            explanation: "selects those rows representing a prime number"
        },
        {
            exprs : ["dv(0..2)<=1 ? false : !Array.from({ length: dv(0..2) - 2 }, (_, i) => i + 2).find(x => dv(0..2) % x === 0)"],
            explanation: "selects those rows whose 3 (q0, q1, q2) first qubits are a prime number"
        },
        {
            exprs : ["dv(3..5)<=1 ? false : !Array.from({ length: dv(3..5) - 2 }, (_, i) => i + 2).find(x => dv(3..5) % x === 0)"],
            explanation: "selects those rows whose 4th, 5th and 6th qubits (q3, q4 and q5) are a prime number"
        },
        {
            exprs : ["(dv(0..2)*dv(3..5)==35)"],
            explanation: "selects those rows whose decimal value of qubits q0, q1 and q2 multiplied by the decimal value of qubits q3, q4 and q5 is 35"
        },
        {
            exprs : [
                `dv(0..2)<=1 ? false : !Array.from({ length: dv(0..2) - 2 }, (_, i) => i + 2).find(x => dv(0..2) % x === 0) && 
                dv(3..5)<=1 ? false : !Array.from({ length: dv(3..5) - 2 }, (_, i) => i + 2).find(x => dv(3..5) % x === 0) &&
                (dv(0..2)*dv(3..5)==35)`
            ],
            explanation: "it is the conjunction of the three previous conditions. These expressiones select those rows whose 3 first qubits are prime numbers, whose 4th, 5h and 6th qubits are also a prie number and the decimal value of qubits q0, q1 and q2 multiplied by the decimal value of qubits q3, q4 and q5 is 35"
        }
    ]
    hideInstructions: boolean = true

    constructor(protected qiskitService: QiskitService) {}

    saveCode() {
        this.error = undefined
        this.qiskitCode.qubits = this.qubits
        this.qiskitService.saveCode(this.qiskitCode).subscribe(
        result => {
            alert("Code saved")
        },
        error => {
            this.error = error.error ? error.error.message : error
        }
        )
    }

    abstract tryFill(index : number) : void
    abstract reset() : void
    abstract fillTable(marking : boolean) : void
    
    // markElementsWithUserExpressions() {
    //     this.error = undefined
    //     if (this.userExpressions.length == 0) {
    //       this.error = "There are no expressions to fill-in the table"
    //       return
    //     }
    //     this.reset()
    //     try {
    //       this.fillTable(true)
    //     } catch (error) {
    //       this.error = error
    //     }
    // }

    fillTableWithUserExpressions() {
        this.error = undefined
        if (this.userExpressions.length == 0) {
          this.error = "There are no expressions to fill-in the table"
          return
        }
        this.reset()
        try {
          this.fillTable(true)
        } catch (error) {
          this.error = error
        }
    }

    addUserExpression(): void {
        this.error = undefined
        if (this.currentUserExpression.trim().length == 0) {
            this.error = "Write some expression"
            return
        }
        this.userExpressions.push(this.currentUserExpression)
    }
    
    removeUserExpression(index: number) {
        this.userExpressions.splice(index, 1)
    }
}