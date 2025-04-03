import { Component, ElementRef, ViewChild } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { DeterministicService } from '../deterministic.service';
import { GroverStyle } from '../common/GroverStyleComponent';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ManagerService } from '../manager.service';
import { CodeTemplate } from '../templates/CodeTemplate';
import { QiskitCode } from '../grover/QiskitCode';
import { QiskitService } from '../qiskit.service';
import { FreqTable } from './FreqTable';

Chart.register(...registerables)

@Component({
  selector: 'app-deterministic',
  templateUrl: './deterministic.component.html',
  styleUrls: ['./deterministic.component.css']
})
export class DeterministicComponent extends GroverStyle {
  @ViewChild('codeArea', { static: false }) codeArea!: ElementRef;
  
  shots : number = 0
  desiredError : number = 0.05

  probOf0 : number = 0.5

  expectedFrequencies : FreqTable = new FreqTable()

  physicalAngle : number = 0
  prefix? : string

  originalGR : boolean = false
  splitCircuits : boolean = false

  running : boolean = false
  state? : string 

  codeAsFunctions = true
  svgTree: SafeHtml | null = null; // SVG seguro para renderizar
  svgWidth : number = 0
  svgHeight : number = 0

  maxRows = 1024

  responseReceived? : any

  constructor(private service : DeterministicService, protected override qiskitService: QiskitService, private sanitizer : DomSanitizer, public manager : ManagerService) {
    super(qiskitService)

    this.updateOutputs()
  }

  override tryFill(index: number): void {
      this.reset()
      let exprs = this.javaExamples[index].exprs
      this.userExpressions = []
      this.userExpressions = this.userExpressions.concat(exprs)
      this.markElementsWithUserExpressions()
  }

  setFrequenciesWithUserExpressions() {
    this.error = undefined
    if (this.userExpressions.length == 0) {
      this.error = "There are no expressions to fill-in the table"
      return
    }
    this.reset()
    try {
      this.fillTable(false)
    } catch (error) {
      this.error = error
    }
}

  fillTable(marking : boolean) {
    if (this.userExpressions.length == 0)
      throw Error("There are no expressions to fill-in the table")
    if (!this.expectedFrequencies)
      throw Error("There is no matrix")

    this.selectedElements = 0
    let expr, row, wholeExpression
    for (let i = 0; i < this.expectedFrequencies.rows; i++) {
      wholeExpression = ""
      row = i.toString(2).padStart(this.qubits, '0')
      for (let j = 0; j < this.userExpressions.length; j++) {
        expr = this.userExpressions[j]
        expr = this.replaceToken(expr, "input", i)
        expr = this.replaceDecimalValues(expr, row)
        expr = this.replaceQ(expr, row)
        wholeExpression = wholeExpression + "(" + expr + ") || "
      }
      if (wholeExpression.length > 0)
        wholeExpression = wholeExpression.substring(0, wholeExpression.length - 4).trim()
      let result = eval(wholeExpression )
      if (marking && result)
        this.expectedFrequencies.setFreq(i, 100)
      else if (result)
        this.expectedFrequencies.setFreq(i, result)
    }
    this.updateOutputs()
  }

  private replaceQ(expr: string, row: string) {
    let qs = this.findQs(expr)
    for (let i = 0; i < qs.length; i++) {
      let index = qs[i]
      expr = expr.replace("q" + index, "" + parseInt(row[index]))
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

  private replaceDecimalValues(evaluableExpr: string, row: string) {
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

  private getDecimalValue(row: string, startQubit: number, endQubit: number) {
    let cont = endQubit - startQubit
    let value = 0
    for (let i = startQubit; i <= endQubit; i++) {
      value = value + parseInt(row[i]) * Math.pow(2, cont--)
    }
    return value
  }

  private replaceToken(expr: string, token: string, index: number) {
    while (expr.indexOf(token) != -1)
      expr = expr.replace(token, "" + index)
    return expr
  }

  buildCode() {
    let code = this.manager.selectedTemplate.code
    if (!this.responseReceived)
      return

    if (this.codeAsFunctions) {
        for (let key in this.responseReceived) {
          if (key!='tree' && key!='unitaryMatrix') {
            let value = this.responseReceived[key]
            code = code?.replace(key, value)
          }
        }
    } else {
      for (let key in this.responseReceived) {
        if (key!='tree' && key!='#INITIALIZE#' && key!='unitaryMatrix') {
          let value = this.responseReceived[key]
          code = code?.replace(key, value)
        }
      }
      code = code?.replace("#INITIALIZE#", this.drawMatrix(this.responseReceived["unitaryMatrix"]))
    }
    this.qiskitCode = new QiskitCode()
    this.qiskitCode.lines = code?.split("\n") || []
  }

  private drawMatrix(matrixReceived : any) : string {
    let matrix = []
    for (let i=0; i<matrixReceived.numberOfRows; i++) {    
      let row =  new Array(matrixReceived.numberOfRows).fill(0)
      let colsWithData = Object.keys(matrixReceived.rows[i].values)      
      for (let k=0; k<colsWithData.length; k++) {
        let colIndex = parseInt(colsWithData[k])
        row[colIndex] = matrixReceived.rows[i].values[colIndex].re
      }
      matrix.push(row)
    }

    let result : string = "U = Operator([\n"
    for (let i=0; i<matrix.length; i++) {
      result = result + "\t["
      for (let j=0; j<matrix.length; j++)
        result = result + matrix[i][j] + ", "
      result = result + "],\n"
    }
    result += "\n])\n"
    return result
  }

  switchOutput() {
    this.codeAsFunctions = !this.codeAsFunctions
    this.buildCode()
  }

  getCircuit() {
    this.running = true
    this.state = "Calculating"
    this.error = undefined

    this.service.calculate(this.qubits, this.expectedFrequencies, this.physicalAngle, this.originalGR, this.splitCircuits, this.prefix).subscribe(
      response=> {
        this.responseReceived = response
        this.buildCode()

        const { svg, width, height } = this.generateSvgFromBottom(response.tree);
        this.svgTree = this.sanitizer.bypassSecurityTrustHtml(svg);
        this.svgWidth = width; // Define el ancho dinámico del SVG
        this.svgHeight = height; // Define el alto dinámico del SVG
        this.state = undefined
      },
      error => {
        if (error.error && error.error.message)
          this.error = error.error.message
        else
          this.error = error.message + " (is the server running?)"
      }
    )
  }

  goToCode() {
    this.codeArea.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private shouldDisplay(node : any) : boolean {
    return node && (node.leftProbability>0 || node.rightProbability>0)
  }

  generateSvgFromBottom(
    tree: any,
    startX = 70,
    levelHeight = 100,
    leafSpacing = 110 // Espaciado mínimo entre hojas
  ): { svg: string; width: number; height: number } {
    const positions: Map<any, { x: number; y: number }> = new Map();
    let maxWidth = 0;
  
    // Paso 1: Calcular posiciones desde las hojas hacia arriba
    const calculatePositions = (node: any, level: number): number => {
      if (!node || !this.shouldDisplay(node)) return 0; // Ignorar nodos que no deben mostrarse
  
      const y = level * levelHeight;
      let x: number;
  
      if (!node.leftChild && !node.rightChild) {
        // Nodo hoja: Asegurar espaciado mínimo entre hojas
        x = startX + maxWidth;
        positions.set(node, { x, y });
        maxWidth += leafSpacing; // Incrementar con el espaciado fijo para hojas
        return x;
      }
  
      // Calcular posiciones de los hijos visibles
      const leftX = this.shouldDisplay(node.leftChild)
        ? calculatePositions(node.leftChild, level + 1)
        : 0;
      const rightX = this.shouldDisplay(node.rightChild)
        ? calculatePositions(node.rightChild, level + 1)
        : 0;
  
      // Si ambos hijos están ocultos, no mostrar el nodo actual
      if (leftX === 0 && rightX === 0) return 0;
  
      // La posición del nodo padre es el promedio de las posiciones de los hijos visibles
      x = (leftX + rightX) / (leftX && rightX ? 2 : 1);
      positions.set(node, { x, y });
      return x;
    };
  
    calculatePositions(tree, 0);
  
    // Paso 2: Generar SVG
    let svg = '';
    positions.forEach((pos, node) => {
      const { x, y } = pos;
      const nodeWidth = 100;
      const nodeHeight = 60;
  
      // Dibujar el nodo actual
      svg += `
    <!-- Nodo principal con un solo rectángulo -->
    <rect x="${x - nodeWidth / 2}" y="${y}" width="${nodeWidth}" height="${nodeHeight + 20}" fill="#f0f0f0" stroke="#000"/>
    
    <!-- Recuadro para el nombre con fondo verde claro -->
    <rect x="${x - nodeWidth / 2}" y="${y}" width="${nodeWidth}" height="20" fill="#dff0d8" stroke="#000"/>
    
    <!-- Texto del nombre -->
    <text x="${x}" y="${y + 15}" font-size="12" font-weight="bold" text-anchor="middle">${node.name || 'Node'}</text>
    
    <!-- Líneas de división -->
    <line x1="${x - nodeWidth / 2}" y1="${y + 20}" x2="${x + nodeWidth / 2}" y2="${y + 20}" stroke="#000"/>
    <line x1="${x - nodeWidth / 2}" y1="${y + 40}" x2="${x + nodeWidth / 2}" y2="${y + 40}" stroke="#000"/>
    <line x1="${x}" y1="${y + 20}" x2="${x}" y2="${y + nodeHeight + 20}" stroke="#000"/>
    
    <!-- Textos dentro del nodo -->
    <text x="${x - nodeWidth / 4}" y="${y + 35}" font-size="12" font-weight="bold" text-anchor="middle">0</text>
    <text x="${x + nodeWidth / 4}" y="${y + 35}" font-size="12" font-weight="bold" text-anchor="middle">1</text>
    <text x="${x - 40}" y="${y + 55}" font-size="12">${node.leftProbability?.toFixed(2) || '-'}</text>
    <text x="${x + 10}" y="${y + 55}" font-size="12">${node.rightProbability?.toFixed(2) || '-'}</text>
    <text x="${x - 40}" y="${y + 75}" font-size="12">${node.leftAngle?.toFixed(2) || '-'}</text>
    <text x="${x + 10}" y="${y + 75}" font-size="12">${node.rightAngle?.toFixed(2) || '-'}</text>
  `;
  
  
    // Dibujar líneas hacia los hijos visibles
    if (this.shouldDisplay(node.leftChild) || this.shouldDisplay(node.rightChild)) {
      // Punto intermedio vertical entre el padre y los hijos
      const midY = y + nodeHeight + 30;
    
      // Línea vertical desde el centro inferior del nodo padre al punto intermedio
      svg += `<line x1="${x}" y1="${y + nodeHeight + 20}" x2="${x}" y2="${midY}" stroke="#000"/>`;
    
      // Conexiones horizontales hacia los hijos
      if (this.shouldDisplay(node.leftChild)) {
        const leftPos = positions.get(node.leftChild);
        svg += `
          <line x1="${x}" y1="${midY}" x2="${leftPos?.x}" y2="${midY}" stroke="#000"/>
          <!-- Línea vertical desde el punto horizontal al nodo hijo -->
          <line x1="${leftPos?.x}" y1="${midY}" x2="${leftPos?.x}" y2="${leftPos?.y}" stroke="#000"/>
        `;
      }
    
      if (this.shouldDisplay(node.rightChild)) {
        const rightPos = positions.get(node.rightChild);
        svg += `
          <line x1="${x}" y1="${midY}" x2="${rightPos?.x}" y2="${midY}" stroke="#000"/>
          <!-- Línea vertical desde el punto horizontal al nodo hijo -->
          <line x1="${rightPos?.x}" y1="${midY}" x2="${rightPos?.x}" y2="${rightPos?.y}" stroke="#000"/>
        `;
      }
    }
  });
  
    return {
      svg,
      width: maxWidth + startX,
      height: positions.size * levelHeight,
    };
  }

  updateOutputs() {
    this.expectedFrequencies.setQubits(this.qubits)
    this.calculateShots()
    
    let shots = this.expectedFrequencies.getShots()
   // for (let i=0; i<this.expectedFrequencies.rows; i++)
     // this.relativeFrequencies.push(this.expectedFrequencies[i]*100/shots)
  }

  reset() {
    this.expectedFrequencies = new FreqTable()
    this.expectedFrequencies.setQubits(this.qubits)
    this.calculateShots()
    this.updateOutputs()
  }

  random(factor : number) {
    this.expectedFrequencies = new FreqTable()
    this.expectedFrequencies.setQubits(this.qubits)
    for (let i=0; i<this.expectedFrequencies.rows; i++)
        this.expectedFrequencies.setFreq(i, Math.round(Math.random()*100*factor))
    this.calculateShots()
    this.updateOutputs()
  }

  zeroTo2N() {
    this.expectedFrequencies = new FreqTable()
    this.expectedFrequencies.setQubits(this.qubits)
    for (let i=0; i<this.expectedFrequencies.rows; i++)
      this.expectedFrequencies.setFreq(i, i)
    this.calculateShots()
    this.updateOutputs()
  }

  withProb() {
    this.expectedFrequencies = new FreqTable()
    this.expectedFrequencies.setQubits(this.qubits)
    
    for (let i=0; i<this.expectedFrequencies.rows; i++)
      if (Math.random() >= this.probOf0)
        this.expectedFrequencies.setFreq(i, Math.round(Math.random()*100))
    this.calculateShots()
    this.updateOutputs()
  }

  private calculateShots() {
    this.shots = this.expectedFrequencies.getShots()
  }

  copyCode(copyTooltip: HTMLElement): void {
    this.codeArea.nativeElement.click()
    const text = this.codeArea.nativeElement.innerText;
    navigator.clipboard.writeText(text).then(() => {
      const originalTitle = copyTooltip.title;
      copyTooltip.title = 'Copied!';
      
      // Opcional: forzar el tooltip actualizando el atributo
      copyTooltip.click(); // Algunos navegadores lo fuerzan así
  
      setTimeout(() => {
        copyTooltip.title = originalTitle;
      }, 1500); // Vuelve al tooltip original después de 1.5 segundos
    }).catch(err => {
    });
  }

  onTemplateChange(selected: CodeTemplate) {
    this.manager.selectedTemplate = this.manager.templates.find(t=> t.fileName==selected.fileName) || new CodeTemplate("", "", "")
  }

  setFreq(event : any, rowIndex : number) {
    let freq = parseInt(event.target.value)
    this.expectedFrequencies.setFreq(rowIndex, freq)
  }
}
