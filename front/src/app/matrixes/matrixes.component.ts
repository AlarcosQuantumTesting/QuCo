import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { QuirkService } from '../quirk.service';
import { QiskitService } from '../qiskit.service';
import { FillingService } from '../filling.service';
import { ManagerService } from '../manager.service';
import { CodeTemplate } from '../templates/CodeTemplate';

@Component({
  selector: 'app-matrixes',
  templateUrl: './matrixes.component.html',
  styleUrls: ['./matrixes.component.css']
})
export class MatrixesComponent  {
  inputQubits : number = 3
  outputQubits : number = 3

  cols : number = 0
  rows : number = 0
  matrix? : any[]
  decimals? : any[]

  finalMatrix? : any[]
  finalMatrixNumberOfRows : number = 0

  startMatrix? : any[]

  reduceQuirk : boolean = true
  reduceQuiskit : boolean = true
  
  quirkURL? : SafeResourceUrl
  finalQiskitGate? : string
  qiskitMatrixStart : string = ""
  qiskitMatrix? : any 
  qiskitMatrixEnd : string = ""
  calculusTime? : number
  values? : number[]
  error ? : any

  domain : string = "amplitude"

  max : number = 50000
  dataReceived : boolean = false
  numberOfReceivedMatrixes : number = 0
  qiskitCode? : string[]

  hideExamples : boolean = true
  javaExamples : any[] = [ 
    {  
      exprs : [ "q5 = (input!=0 && q2==1) ? 1 : 0" ],
      explanation : "if the current row (the input) is not ZERO and q2==1, then make q5=1 (i.e., mark the input number as an even number)"
    },
    {  
      exprs : [ "q5 = (input%2==0) ? 1 : 0" ],
      explanation : "if the current row is pair or zero, then make q5=1"
    },
    {  
      exprs : [ "q5 = (q0==1 && q2==1) ? 1 : 0" ],
      explanation : "if the first (q0) and the third (q2) qubits are 1, then make q5=1 (i.e., mark the input number as an even number)"
    },
    {  
      exprs : [ "q3 = (q0==1) ? 0 : 1", "q4 = (q1==1) ? 0 : 1", "q5 = (q2==1) ? 0 : 1" ],
      explanation : "Negate all the input qubits"
    },
    {
      exprs : [ "output = 3 * input"],
      explanation : "The output qubits are three times the input qubits"
    },
    {
      exprs : [ "output = 3 * q0 + 2 * q1 + q2"],
      explanation : "The output qubits are 3 * q0 + 2 * q1 + q2"
    },
    {
      exprs : [ "output = (q0==1 ? input : 0)" ],
      explanation : "If the first qubit is 1, then set the output qubits to the input ones; otherwise, set them to zero"
    },
    { 
      exprs : [ "output = dv(0..1) + dv(2..3)"],
      explanation : "The output is the decimal value of q0 and q1 times the decimal value of q2 and q3"
    },
    {
      exprs : [ "output=input <= 1 ? false : !Array.from(new Array(input), (el, i) => i + 1).filter(x => x > 1 && x < input).find(x => input % x === 0)" ],
      explanation : "Decides in the last qubit whether the input qubits represent a prime number"
    }
  ]
  hideInstructions : boolean = true

  currentUserExpression : string = ""
  userExpressions : string[] = []

  dialogo : any = undefined

  constructor(private quirkService : QuirkService, private qiskitService : QiskitService, private fillingService : FillingService, public sanitizer : DomSanitizer, public manager : ManagerService) {}

  addUserExpression(): void {
    this.error = undefined
    if (this.currentUserExpression.trim().length==0) {
      this.error = "Write some expression"
      return
    }
    this.userExpressions.push(this.currentUserExpression)
  }

  openTextArea(c : MatrixesComponent, e : Event, title : string, elementIndex? : number) {
    let caja = e.target as any
    this.createDialog(c, caja, title, elementIndex)
    this.dialogo.showModal()
    let textoDialogo = this.dialogo.getElementsByTagName("textarea")[0];			
    textoDialogo.value = caja!.value;
    this.dialogo.getElementsByTagName("textarea")[0].focus();
  }

  protected createDialog(cc : MatrixesComponent, caja : any, title : string, parameterIndex? : number) {
    let selfCaja = caja
    let textArea : any
    if (!this.dialogo) {
        this.dialogo = document.createElement("dialog")
        this.dialogo.setAttribute("id", "dialogo");
        let label = document.createElement("strong")
        label.innerHTML = title + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
        let a = document.createElement("u")
        a.innerHTML = "Close"
        let self = this
        a.onclick = function() {
            if (textArea!.value.trim().length>0) {
                let expressions = textArea!.value.split("\n")
                for (let i=0; i<expressions.length; i++) {
                  if (expressions[i].trim().length==0)
                    continue
                  self.currentUserExpression = expressions[i]
                  self.addUserExpression()
                }
            }
            selfCaja.parentElement.removeChild(self.dialogo)
            self.dialogo = null
            selfCaja.focus()
        }
        this.dialogo.appendChild(label)
        this.dialogo.appendChild(a)

        this.dialogo.appendChild(document.createElement("br"))
        textArea = document.createElement("textarea"); 
        this.dialogo.appendChild(textArea);
        textArea.setAttribute("placeholder", "Write expressions in different lines. For example:\n\nq3 = q0\n" + 
          "q4 = q1\nq5 = (q0&&q1)^q2\n")
        textArea.setAttribute("rows", "15");
        textArea.setAttribute("cols", "60");
        textArea.ondblclick = function() {
          textArea.value = "q3 = q0\nq4 = q1\nq5 = (q0&&q1)^q2\n"
        }
    }
    caja.parentElement.appendChild(this.dialogo);
}

  removeUserExpression(index : number) {
    this.userExpressions.splice(index, 1)
  }

  fillTableWithUserExpressions() {
    this.error = undefined
    if (this.userExpressions.length==0) {
      this.error = "There are no expressions to fill-in the table"
      return
    }
    this.reset()
    try {
      let matrix = this.fillingService.fillTable(this.userExpressions, this.inputQubits, this.outputQubits)
      this.rows = matrix.length
      this.cols = matrix[0].length
      this.load(matrix)
    } catch (error) {
      this.error = error
    }
  }

  tryFill(index : number) {
    this.reset()
    let exprs = this.javaExamples[index].exprs
    let matrix = this.fillingService.fillTable(exprs, this.inputQubits, this.outputQubits)
    this.rows = matrix.length
    this.cols = matrix[0].length
    this.load(matrix)
  }

  private reset() {
    this.error = undefined
    this.finalMatrix = []
    this.dataReceived = false
    this.numberOfReceivedMatrixes = 0
    this.qiskitCode = []
    this.calculusTime = 0
    this.qiskitMatrixStart = ""
    this.qiskitMatrixEnd = ""
  }

  getEmptyMatrix() {
    this.reset()
    this.quirkService.getEmptyMatrix(this.outputQubits, this.inputQubits).subscribe(
      result => {
        this.rows = result.numberOfRows
        this.cols = result.numberOfCols
        this.load(result.matrix)
      }
    )
  }

  drawQuirk(index : number, matrix : any[]) {
    this.reset()
    let info = {
      matrix : matrix[index],
      inputQubits : this.inputQubits,
      qubits : this.inputQubits + this.outputQubits,
      domain : this.domain
    }
    this.quirkService.getQuirk(info).subscribe(
      result => {
        let url = this.sanitizer.bypassSecurityTrustResourceUrl("https://algassert.com/quirk#circuit=" + JSON.stringify(result))
        this.quirkURL = url
        window.open("https://algassert.com/quirk#circuit=" + JSON.stringify(result), "_new")
      }
    )
  }

  drawAllQuirk(matrix : any[]) {
    this.reset()
    let info = {
      matrix : matrix,
      inputQubits : this.inputQubits,
      qubits : this.inputQubits + this.outputQubits,
      reduce : this.reduceQuirk,
      domain : this.domain
    }

    this.quirkService.getAllQuirk(info).subscribe(
      result => {
        let url = this.sanitizer.bypassSecurityTrustResourceUrl("https://algassert.com/quirk#circuit=" + JSON.stringify(result))
        this.quirkURL = url
        window.open("https://algassert.com/quirk#circuit=" + JSON.stringify(result), "_new")
      }
    )
  }

  getUnitaryMatrix(matrix : any[], rowIndex? : number) {
    this.reset()
    let info = {
      matrix : matrix,
      inputQubits : this.inputQubits,
      qubits : this.inputQubits + this.outputQubits
    }
    if (rowIndex!=undefined) {
      info.matrix = matrix[rowIndex]
    }
    this.qiskitService.getQiskitMatrix(info).subscribe(
      result => {
        this.loadMatrixes(result)
      }
    )
  }

  getQiskitCode(matrix : any[], type : string, rowIndex? : number) {
    this.reset()
    let info = {
      matrix : matrix,
      inputQubits : this.inputQubits,
      qubits : this.inputQubits + this.outputQubits,
      reduce : this.reduceQuiskit,
      domain : this.domain,
      template : this.manager.selectedTemplate,
      type : type
    }
    if (rowIndex!=undefined)
      info.matrix = matrix[rowIndex]
    this.qiskitService.getCode(info).subscribe(
      result => {
        this.qiskitCode = result.code
        this.replaceShotsToken(1000)
      }
    )
  }

  replaceShotsToken(shots : any) {
    if (!this.qiskitCode)
      return
    for (let i=0; i<this.qiskitCode.length; i++)
      this.qiskitCode[i] = this.qiskitCode[i].replace("#SHOTS#", shots)
  }

  addHadamardGates() {
    let start = 0
    for (let i=0; i<this.qiskitCode!.length; i++) {
      if (this.qiskitCode![i].startsWith("#Output qubits")) {
        start = i
        break
      }
    }
    while (this.qiskitCode![start].trim().length!=0)
      start++

    this.qiskitCode!.splice(start++, 0, "#HADAMARD GATES#\n")
    for (let i=0; i<this.inputQubits; i++) {
      this.qiskitCode!.splice(start++, 0, "circuit.h(" + i + ")\n")
    }
  }

  countLastQubit() {
    let code = [ "counts_output_qubit" + " = absolute_frequencies.get('1', 1)\n",
      "probability_output_qubit = counts_output_qubit / 1000\n",
      "result" + " = " + (2**this.inputQubits) + " * probability_output_qubit\n",
      "print(f\"Probability of getting 1 in the output qubit: {result}\")"
    ]
    for (let i=0; i<code.length; i++)
      this.qiskitCode?.push(code[i])    
  }

  private loadMatrixes(result : any) {
    this.dataReceived = true
    this.calculusTime = result.time

    this.qiskitMatrixStart = result.start
    this.qiskitMatrixEnd = result.end
    result = result.matrix
    this.numberOfReceivedMatrixes = result.length

    let matrix = result
    if (!matrix) {
      this.numberOfReceivedMatrixes = -1
      return
    }
    this.qiskitMatrix = this.fill(matrix)
  }

  private fill(gateMatrix : any) : any {
    const ZERO = 0
    let result : any = []
    for (let i=0; i<gateMatrix.numberOfRows; i++) {
      result.push([])
      let colsWithData = Object.keys(gateMatrix.rows[i].values)
      for (let j=0; j<gateMatrix.numberOfRows; j++) {
        let flag = false
        for (let k=0; k<colsWithData.length; k++) {
          if (parseInt(colsWithData[k])==j) {
            result[i].push(1)
            flag = true
            break
          }
        }
        if (!flag)
          result[i].push(ZERO)
      }
    }
    return result
  }

  private load(matrix: any) {
    this.error = undefined
    this.matrix = []
    this.decimals = []
    for (let i=0; i<matrix.length; i++) {
      let rRow = matrix[i]
      let row = []
      for (let j=0; j<rRow.length; j++)
        row.push(parseInt(rRow[j]))
      this.matrix.push(row)
      this.decimals.push(this.getDecimals(row))
    }
  }

  private getDecimals(row : any[]) {
    let r = 0
    let cont = this.outputQubits - 1
    for (let i=this.inputQubits; i<this.inputQubits+this.outputQubits; i++)
      r = r + row[i] * Math.pow(2, cont--)
    return r
  }

  negate(rowIndex : number, colIndex : number) {
    if (colIndex<this.inputQubits)
      return
    let value = this.matrix![rowIndex][colIndex]
    this.matrix![rowIndex][colIndex] = (value==0 ? 1 : 0)
    let row = this.matrix![rowIndex]
    let r = 0
    let cont = this.outputQubits - 1
    for (let i=this.inputQubits; i<row.length; i++)
      r = r + row[i] * Math.pow(2, cont--)
    this.decimals![rowIndex] = r
  }

  updateOutputQubits(rowIndex : number) {
    this.error = undefined
    let value = this.decimals![rowIndex]
    let s = value.toString(2)
    for (let i=s.length; i<this.outputQubits; i++)
      s = "0" + s
    for (let i = this.inputQubits; i<this.inputQubits + this.outputQubits; i++) {
      this.matrix![rowIndex][i] = parseInt(s[i-this.inputQubits])
    }
  }

  onTemplateChange(selected: CodeTemplate) {
    this.manager.selectedTemplate = this.manager.templates.find(t=> t.fileName==selected.fileName) || new CodeTemplate("", "", "")
  }
    
}
