import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FillingService {
  
  fillTable(exprs: string[], inputQubits: number, outputQubits?: number) : any[] {
    let matrix = this.emptyMatrix(inputQubits, outputQubits)
    for (let i=0; i<exprs.length; i++) {
      let expr = this.trim(exprs[i])
      let posEquals = expr.indexOf("=")
      if (posEquals==-1)
        throw Error("The expression " + expr + " is not an assignment")
      let left = this.trim(expr.substring(0, posEquals))
      let evaluableExpr = this.trim(expr.substring(posEquals+1))

      if (left.toLowerCase()=="output") {
        this.fillWithInputOutput(matrix, evaluableExpr, inputQubits, outputQubits)
      } else if (left.startsWith("q")) {
        let leftQubit = parseInt(left.substring(1))
        this.fillQubit(leftQubit, evaluableExpr, matrix)
      } else throw Error("The left side of " + expr + " is neither a qubit nor the 'output' keyword")
    }
    return matrix
  }

  private fillQubit(leftQubit : number, evaluableExpr : string, matrix : number[][]) {
    for (let i=0; i<matrix.length; i++) {
      let row = matrix[i]
      let rowRight = evaluableExpr
      rowRight = this.replaceToken(rowRight, "input", i)
      rowRight = this.replaceDecimalValues(rowRight, row)
      rowRight = this.replaceQ(rowRight, row)
      let value = eval(rowRight) 
      if (value===false)
        value = 0
      else if (value===true)
        value = 1
      let binaryValue = value.toString(2)
      row[leftQubit] = parseInt(binaryValue[0])
    }
  }

  private replaceToken(expr : string, token : string, index : number) {
    while (expr.indexOf(token)!=-1)
      expr = expr.replace(token, "" + index)
    return expr
  }

  private replaceDecimalValues(evaluableExpr : string, row : number[]) {
    let ranges : string[] = []
    let posDV = 0
    let expr = evaluableExpr
    do {
      posDV = expr.indexOf("dv", posDV)
      if (posDV!=-1) {
        let posIzdo = expr.indexOf("(", posDV)
        let posDcho = expr.indexOf(")", posDV)
        ranges.push(expr.substring(posIzdo+1, posDcho))
        posDV = posDcho
      }
    } while (posDV!=-1)
    
    for (let i=0; i<ranges.length; i++) {
      let range = ranges[i]
      let startQubit = parseInt(range.substring(0, range.indexOf("..")))
      let endQubit = parseInt(range.substring(range.indexOf("..") + 2))
      let value = this.getDecimalValue(row, startQubit, endQubit)
      evaluableExpr = evaluableExpr.replace("dv(" + range + ")", "" + value)
    }
    return evaluableExpr
  }

  private getDecimalValue(row : number[], startQubit : number, endQubit : number) {
    let cont = endQubit-startQubit
    let value = 0
    for (let i=startQubit; i<=endQubit; i++) {
      value = value + row[i]*Math.pow(2, cont--)
    }
    return value
  }

  private fillWithInputOutput(matrix : number[][], evaluableExpr : string, inputQubits : number, outputQubits? : number) {
    let start = inputQubits
    let end = inputQubits + (outputQubits ? outputQubits : 0) - 1
    for (let i=0; i<matrix.length; i++) {
      let row = matrix[i]
      let rowRight = evaluableExpr
      rowRight = this.replaceToken(evaluableExpr, "input", i)
      rowRight = this.replaceDecimalValues(rowRight, row)
      rowRight = this.replaceQ(rowRight, row)
      let value = eval(rowRight) 
      if (value===false)
        value = 0
      else if (value===true)
        value = 1
      let binaryValue = value.toString(2)
      let cont = binaryValue.length-1
      for (let j=end; j>=start && cont>=0; j--)
        matrix[i][j] = parseInt(binaryValue[cont--])
    }
  }

  private replaceQ(expr : string, row : number[]) {
    let qs = this.findQs(expr)
    for (let i=0; i<qs.length; i++) {
      let index = qs[i]
      expr = expr.replace("q" + index, "" + row[index])
    }
    return expr
  }

  private findQs(expr : string) : number[] {
    let result : number[] = []
    for (let i=0; i<expr.length; i++) {
      let c = expr[i]
      if (c=='q') {
        let q = ""
        let j = i
        do {
          j = j +1
          if (j<expr.length) {
            c = expr[j]
            if (c>='0' && c<='9')
              q = q + c
          }
        } while ((c>='0' && c<='9') && j<expr.length)
        result.push(parseInt(q))
      }
    }
    return result
  }

  private emptyMatrix(inputQubits : number, outputQubits? : number) : number[][] {
    let result : number[][] = []
    let rows = Math.pow(2, inputQubits)
    let binaryString = ""
    let bsLength, zeros
    for (let i=0; i<rows; i++) {
      let row = []
      binaryString = i.toString(2)
      bsLength = binaryString.length
      zeros = inputQubits - bsLength
      for (let j=0; j<zeros; j++)
        row[j] = 0
      for (let j=0; j<bsLength; j++)
        row[zeros+j] = parseInt(binaryString.charAt(j))
      for (let j=inputQubits; j<inputQubits + (outputQubits ? outputQubits : 0); j++)
        row.push(0)
      result.push(row)
    }

    return result
  }

  private trim(expr : string) : string {
    expr = expr.trim()
    //expr = expr.replace(/\s+/g, "")
    return expr
  }
}
