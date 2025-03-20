import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GroverService } from '../grover.service';
import { GroverStyle } from '../common/GroverStyleComponent';
import { ManagerService } from '../manager.service';
import { CodeTemplate } from '../templates/CodeTemplate';
import { QiskitCode } from './QiskitCode';
import { QiskitService } from '../qiskit.service';
@Component({
  selector: 'app-grover',
  templateUrl: './grover.component.html',
  styleUrls: ['./grover.component.css']
})
export class GroverComponent extends GroverStyle {

  cols: number = 0
  rows: number = 0

  startMatrix?: any[]

  quirkURL?: SafeResourceUrl
  finalQiskitGate?: string
  qiskitMatrix?: any
  values?: number[]

  useMCX : boolean = false

  max: number = 50000

  constructor(protected groverService: GroverService, protected override qiskitService : QiskitService, public sanitizer: DomSanitizer, public manager : ManagerService) {
    super(qiskitService)
  }

  override tryFill(index: number): void {
    this.reset()
    let exprs = this.javaExamples[index].exprs
    this.userExpressions = []
    this.userExpressions = this.userExpressions.concat(exprs)
    this.markElementsWithUserExpressions()
  }

  fillTable(marking : boolean) {
    if (this.userExpressions.length == 0)
      throw Error("There are no expressions to fill-in the table")
    if (!this.matrix)
      throw Error("There is no matrix")

    this.selectedElements = 0
    let expr, row, wholeExpression
    for (let i = 0; i < this.matrix.length; i++) {
      wholeExpression = ""
      row = this.matrix[i]
      for (let j = 0; j < this.userExpressions.length; j++) {
        expr = this.userExpressions[j]
        expr = this.replaceToken(expr, "input", i)
        expr = this.replaceDecimalValues(expr, row)
        expr = this.replaceQ(expr, row)
        wholeExpression = wholeExpression + "(" + expr + ") || "
      }
      if (wholeExpression.length > 0)
        wholeExpression = wholeExpression.substring(0, wholeExpression.length - 4).trim()
      let result = eval(wholeExpression)
      row[row.length - 1] = result!=0
      if (row[row.length - 1])
        this.selectedElements++
    }
  }

  private replaceToken(expr: string, token: string, index: number) {
    while (expr.indexOf(token) != -1)
      expr = expr.replace(token, "" + index)
    return expr
  }

  private replaceDecimalValues(evaluableExpr: string, row: number[]) {
    let ranges: string[] = []
    let posDV = 0
    let expr = evaluableExpr
    do {
      posDV = expr.indexOf("dv", posDV)
      if (posDV != -1) {
        let posIzdo = expr.indexOf("(", posDV)
        let posDcho = expr.indexOf(")", posDV)
        ranges.push(expr.substring(posIzdo + 1, posDcho))
        posDV = posDcho
      }
    } while (posDV != -1)

    for (let i = 0; i < ranges.length; i++) {
      let range = ranges[i]
      let startQubit = parseInt(range.substring(0, range.indexOf("..")))
      let endQubit = parseInt(range.substring(range.indexOf("..") + 2))
      let value = this.getDecimalValue(row, startQubit, endQubit)
      evaluableExpr = evaluableExpr.replace("dv(" + range + ")", "" + value)
    }
    return evaluableExpr
  }

  private getDecimalValue(row: number[], startQubit: number, endQubit: number) {
    let cont = endQubit - startQubit
    let value = 0
    for (let i = startQubit; i <= endQubit; i++) {
      value = value + row[i] * Math.pow(2, cont--)
    }
    return value
  }

  /** Funciones copiadas de filling.service.ts **/
  private replaceQ(expr: string, row: number[]) {
    let qs = this.findQs(expr)
    for (let i = 0; i < qs.length; i++) {
      let index = qs[i]
      expr = expr.replace("q" + index, "" + row[index])
    }
    return expr
  }

  private findQs(expr: string): number[] {
    let result: number[] = []
    for (let i = 0; i < expr.length; i++) {
      let c = expr[i]
      if (c == 'q') {
        let q = ""
        let j = i
        do {
          j = j + 1
          if (j < expr.length) {
            c = expr[j]
            if (c >= '0' && c <= '9')
              q = q + c
          }
        } while ((c >= '0' && c <= '9') && j < expr.length)
        result.push(parseInt(q))
      }
    }
    return result
  }

  reset() {
    this.error = undefined
    this.finalMatrix = []
    this.dataReceived = false
    this.numberOfReceivedMatrixes = 0
    this.qiskitCode = new QiskitCode()
    this.calculusTime = 0
    this.qiskitMatrixStart = ""
    this.qiskitMatrixEnd = ""
    this.selectedElements = 0
  }

  getEmptyMatrix() {
    if (this.qubits>12) {
      this.error = "The number of qubits must be less or equal to 12"
      return
    }
    this.reset()
    this.matrix = this.emptyMatrix(this.qubits, 0)
  }

  private emptyMatrix(inputQubits: number, outputQubits: number): number[][] {
    let result: any[][] = []
    let rows = Math.pow(2, inputQubits)
    let binaryString = ""
    let bsLength, zeros
    for (let i = 0; i < rows; i++) {
      let row = []
      binaryString = i.toString(2)
      bsLength = binaryString.length
      zeros = inputQubits - bsLength
      for (let j = 0; j < zeros; j++)
        row[j] = 0
      for (let j = 0; j < bsLength; j++)
        row[zeros + j] = parseInt(binaryString.charAt(j))
      for (let j = inputQubits; j < inputQubits + outputQubits; j++)
        row.push(0)
      row.push(false)
      result.push(row)
    }

    return result
  }

  drawAllQuirk(matrix: any[]) {
    this.reset()
    let info = matrix.filter(row => row[row.length - 1]).map(row => row.slice(0, row.length - 1))

    if (info.length == 0) {
      this.error = "Select some output"
      return
    }

    this.groverService.getAllQuirk(info, this.useMCX).subscribe(
      result => {
        let url = this.sanitizer.bypassSecurityTrustResourceUrl("https://algassert.com/quirk#circuit=" + JSON.stringify(result))
        this.quirkURL = url
        window.open("https://algassert.com/quirk#circuit=" + JSON.stringify(result), "_new")
      }
    )
  }

  getUnitaryMatrix(matrix: any[], rowIndex?: number) {
    this.reset()
    let info = matrix.filter(row => row[row.length - 1]).map(row => row.slice(0, row.length - 1))
    if (info.length == 0) {
      this.error = "Select some output"
      return
    }
    this.groverService.getQiskitMatrix(info).subscribe(
      result => {
        this.loadMatrixes(result)
      },
      error => {
        this.error = error.error ? error.error.message : error
      }
    )
  }

  copyCode() {
    let wholeCode = document.getElementById("wholeCode")
    let range = document.createRange()
    range.selectNode(wholeCode!)
    window.getSelection()!.removeAllRanges(); // clear current selection
    window.getSelection()!.addRange(range); // to select text
    document.execCommand("copy")
    window.getSelection()!.removeAllRanges()
  }

  getQiskitCode(matrix: any[], asFunction : boolean) {
    let name

    this.reset()

    if (asFunction) {
      name = prompt("Enter the name of the function")
      if (!name || name.trim().length==0) {
        this.error = "You must enter a name for the function"
        return
      }
      this.qiskitCode.name = name
      this.qiskitCode.isFunction = true
    }

    let info = {
      matrix : matrix.filter(row => row[row.length - 1]).map(row => row.slice(0, row.length - 1)),
      template : this.manager.selectedTemplate,
      functionName : name
    }
    if (info.matrix.length == 0) {
      this.error = "Select some output"
      return
    }
    this.groverService.getCode(info, this.useMCX).subscribe(
      result => {
        this.qiskitCode.lines = result.code
        document.getElementById("wholeCode")!.scrollIntoView({ behavior: 'smooth' });
        this.copyCode()
        // Sacar un tooltip que diga que se ha copiado el código
      },
      error => {
        this.error = error.error ? error.error.message : error
      }
    )
  }

  private loadMatrixes(result: any) {
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

  private fill(gateMatrix: any): any {
    const ZERO = 0
    let result: any = []
    for (let i = 0; i < gateMatrix.numberOfRows; i++) {
      result.push([])
      let colsWithData = Object.keys(gateMatrix.rows[i].values)
      for (let j = 0; j < gateMatrix.numberOfRows; j++) {
        let flag = false
        for (let k = 0; k < colsWithData.length; k++) {
          if (parseInt(colsWithData[k]) == j) {
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

  mark(rowIndex: number) {
    this.matrix![rowIndex][this.qubits] = !this.matrix![rowIndex][this.qubits]
  }

  onTemplateChange(selected: CodeTemplate) {
    this.manager.selectedTemplate = this.manager.templates.find(t=> t.fileName==selected.fileName) || new CodeTemplate("", "", "")
  }
}
