import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { DeterministicService } from '../deterministic.service';
import { GroverStyle } from '../common/GroverStyleComponent';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ManagerService } from '../manager.service';
import { CodeTemplate } from '../templates/CodeTemplate';
import { QiskitCode } from '../grover/QiskitCode';
import { QiskitService } from '../qiskit.service';
import { FreqTable } from './FreqTable';
import { GroverService } from '../grover.service';
import { EditorComponent } from '../editor/editor.component';
import { Expression } from '../matrixes/Expression';
import { ExpressionsService } from '../expressions.service';

Chart.register(...registerables)

@Component({
  selector: 'app-deterministic',
  templateUrl: './deterministic.component.html',
  styleUrls: ['./deterministic.component.css']
})
export class DeterministicComponent extends GroverStyle {
  @ViewChild('codeArea', { static: false }) codeArea!: ElementRef;
  @ViewChild(EditorComponent) editor!: EditorComponent;
  
  ngAfterViewInit() {
    setTimeout(() => {
      if (this.editor) {
        this.editor.parent = this;
      }
    }, 0);
    
    if (this.editor) {
      this.editor.parent = this;
    }
  }

  ngAfterViewChecked() {
    if (this.editor && !this.editor.parent) {
      this.editor.parent = this;
      console.log("Parent asignado en AfterViewChecked:", this.editor.parent);
    }
  }

  shots : number = 0
  desiredError : number = 0.05

  probOf0 : number = 0.5
  amountOfValues : number = 1

  expectedFrequencies : FreqTable = new FreqTable()

  physicalAngle : number = 0
  prefix? : string

  originalGR : boolean = false

  running : boolean = false
  state? : string 

  codeAsFunctions = true
  svgTree: SafeHtml | null = null; // SVG seguro para renderizar
  svgWidth : number = 0
  svgHeight : number = 0

  maxRows = 1024

  responseReceived? : any
  quirkCodes : string[] = [];
  // mensajeTemporal: string = '';
  numberOfQubits : number | null = null;
  isInvalid: boolean = true;
  tooltipVisible: boolean = false;
  tooltipTableVisible: boolean = false;
  showRecommendations: boolean = false;
  tooltipPiVisible: boolean = false;
  mostrarInstrucciones: boolean = false;
  mostrarTabla: boolean = false;
  isGrover: boolean = true;
  isGrenoble: boolean = false;
  isOriginalGR: boolean = false;
  cambioInput: boolean = false;
  selectedAlgorithm: string = 'grover';
  selectedOptionFreq: string = '';
  selectedQuirk: number = 0;


  isNone: boolean = false;
  isRandom: boolean = false;
  isRandom10: boolean = false;
  isZeroTo2N: boolean = false;
  isProbabilityOf0: boolean = false;
  isAmountOfValues: boolean = false;

  mostrarEjemplos: boolean = false;
  mostrarModal: boolean = false;
  mostrarModalCrearExp: boolean = false;
  isNameDisabled: boolean = false;
  isType: boolean = true;
  fromEdit: boolean = false;
  creatingExpression: boolean = false;
  mostrarModalVerExp: boolean = false;
  showDeleteModal: boolean = false;
  mostrarModalGuargarCode: boolean = false;
  mostrarModalNombreFuncion: boolean = false;
  isLoadingQiskitCode = false;
  mostrarModalTree: boolean = false;

  expressionToDelete: any = null;
  deleteIndex: number = -1;

  dialogo : any = undefined
  filteredExpressions: Expression[] = [];
  expressions: Expression[] = [];
  searchQuery: string = "";
  recommendation: string = '';

  expressionToSave: Expression = { expressionName: '', jsExpression: '', description: '', type: 'grover' };

  //De grover
  totalSelectedElements: number = 0;
  useMCX: boolean = false;


  constructor(private service : DeterministicService, protected override qiskitService: QiskitService, private sanitizer : DomSanitizer,
     public manager : ManagerService, public expService : ExpressionsService) {
    super(qiskitService)

    this.updateOutputs()
  }

  ngOnInit() {

    this.expService.getExpressions().subscribe((data: Expression[]) => {
      this.expressions = data.filter(exp => exp.type === 'grover');
    });
    
    this.updateTotalSelectedElements();
    this.mostrarTabla = localStorage.getItem('mostrarTabla') === 'true';

    this.selectedAlgorithm = localStorage.getItem('selectedAlgorithm') || 'grover';
    
    this.isGrover = this.selectedAlgorithm === 'grover';
    this.isGrenoble = this.selectedAlgorithm === 'grenoble';
    this.isOriginalGR = this.selectedAlgorithm === 'originalGR';
    
    this.selectedOptionFreq = localStorage.getItem('selectedOptionFreq') || 'none';
    this.onOptionFreqChange(this.selectedOptionFreq);
    this.applyOption();

    this.validateInputs();
  }

  override tryFill(index: number): void {
      this.reset()
      this.mostrarTabla = true;
      let exprs = this.javaExamples[index].exprs
      this.userExpressions = []
      this.userExpressions = this.userExpressions.concat(exprs)
      // this.markElementsWithUserExpressions()
      this.fillTableWithUserExpressions()
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
      if (marking && result) {
        if (this.isGrover) {
          this.expectedFrequencies.setFreq(i, 1)
        } else {
          this.expectedFrequencies.setFreq(i, 100)
        }
      } else if (result)
        this.expectedFrequencies.setFreq(i, result)
    }
    this.updateOutputs()

    this.updateTotalSelectedElements();
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
          if (key=="#INITIALIZE#") {
            let tag = "TEMPLATE = '" + this.manager.selectedTemplate.fileName + "'\n"
            tag = tag + "ORIGINAL_QUBITS = " + this.qubits + "\n"
            //if (this.inParallel) 
            //  tag = tag + "PARALLEL = True\n"
            //else
            //  tag = tag + "PARALLEL = False\n"
            if (this.splitCircuits)
              tag = tag + "SPLIT = True\n"
            else
              tag = tag + "SPLIT = False\n"
            code = code?.replace("#INITIALIZE#", tag + this.responseReceived["#INITIALIZE#"])
          } else if (key!='tree' && key!='unitaryMatrix' && key!='QUIRK') {
            let value = this.responseReceived[key]
            code = code?.replace(key, value)
          }
        }
    } else {
      for (let key in this.responseReceived) {
        if (key!='tree' && key!='#INITIALIZE#' && key!='unitaryMatrix' && key!='QUIRK') {
          let value = this.responseReceived[key]
          code = code?.replace(key, value)
        }
      }
      code = code?.replace("#INITIALIZE#", this.drawMatrix(this.responseReceived["unitaryMatrix"]))
    }
    //this.goToCode()
    this.qiskitCode = new QiskitCode()
    this.qiskitCode.lines = code?.split("\n") || []

    let quirks = this.responseReceived["QUIRK"]
    this.quirkCodes = []
    for (let i=0; i<quirks.length; i++) {
      let quirk = quirks[i]
      this.quirkCodes.push(JSON.stringify(quirk))
    }
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

  getCircuit(asGrover? : boolean) {
    this.running = true;
    this.state   = "Calculating";
    this.error   = undefined;
    this.isLoadingQiskitCode = true;
    this.mostrarModal = true;

    if (!asGrover) 
      asGrover = false
  
    this.service.calculate(
      this.qubits,
      this.expectedFrequencies,
      this.physicalAngle,
      this.isOriginalGR,
      this.inParallel,
      this.splitCircuits,
      asGrover,
      this.prefix
    ).subscribe(
      blob => {
        blob.text().then(text => {
          let response : any;
          try {
            response = JSON.parse(text);
          } catch (e) {
            this.error   = 'Error parseando JSON: ' + e;
            this.running = false;
            this.isLoadingQiskitCode = false;
            this.mostrarModal = false;
            return;
          }
  
          this.responseReceived = response;
          this.buildCode();
    
          const { svg, width, height } =
            this.generateSvgFromBottom(response.tree);
          this.svgTree   = this.sanitizer.bypassSecurityTrustHtml(svg);
          this.svgWidth  = width;
          this.svgHeight = height;
          this.state     = undefined;
          this.running   = false;
          this.isLoadingQiskitCode = false;
          this.mostrarModal = true;
        })
      },
      err => {
        this.error   = err.error?.message || err.message;
        this.running = false;
        this.isLoadingQiskitCode = false;
        this.mostrarModal = false;
        this.mensajeTemporal = 'Error generating code';
        setTimeout(() => {
            this.mensajeTemporal = '';
        }, 2000);
      }
    );
  }
  

  /*getCircuit() {
    this.running = true
    this.state = "Calculating"
    this.error = undefined

    this.service.calculate(this.qubits, this.expectedFrequencies, this.physicalAngle, this.originalGR, this.inParallel, this.splitCircuits, this.prefix).subscribe(
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
  }*/

  goToCode() {
    this.codeArea.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private shouldDisplay(node : any) : boolean {
    return true // node && (node.leftProbability>0 || node.rightProbability>0)
  }

  generateSvgFromBottom(
    tree: any,
    startX = 70,
    levelHeight = 100,
    leafSpacing = 110 // Espaciado mínimo entre hojas
  ): { svg: string; width: number; height: number } {
    type Pos = { x: number; y: number; level: number };
    const positions = new Map<any, Pos>();
    let maxX = 0;
    let maxLevel = 0;
  
    // -------------------------
    // 1) CÁLCULO DE POSICIONES
    // -------------------------
    const calculate = (node: any, level: number): Pos | null => {
      if (!node || !this.shouldDisplay(node)) {
        return null;
      }
      maxLevel = Math.max(maxLevel, level);
      const y = level * levelHeight;
  
      // Si es hoja visible, le damos la siguiente posición libre
      const left = calculate(node.leftChild, level + 1);
      const right = calculate(node.rightChild, level + 1);
  
      let x: number;
      if (!left && !right) {
        // Hoja
        x = startX + maxX;
        maxX += leafSpacing;
      } else {
        // Nodo interno: promediamos sólo hijos existentes
        if (left && right) {
          x = (left.x + right.x) / 2;
        } else {
          x = (left ?? right)!.x;
        }
      }
  
      const pos = { x, y, level };
      positions.set(node, pos);
      return pos;
    };
  
    calculate(tree, 0);
  
    // -------------------
    // 2) GENERACIÓN DE SVG
    // -------------------
    const nodeW = 100, nodeH = 60;
    let svgContent = '';
  
    // Primero las líneas de conexión
    positions.forEach((pos, node) => {
      const { x, y } = pos;
      const children = ['leftChild', 'rightChild'] as const;
      const midY = y + nodeH + 20;
  
      children.forEach(dir => {
        const child = node[dir];
        const childPos = positions.get(child);
        if (childPos) {
          // Línea vertical del padre al midY
          svgContent += `<line x1="${x}" y1="${y + nodeH + 20}" x2="${x}" y2="${midY}" stroke="#000"/>`;
          // Línea horizontal al child.x a nivel midY
          svgContent += `<line x1="${x}" y1="${midY}" x2="${childPos.x}" y2="${midY}" stroke="#000"/>`;
          // Línea vertical al child.y
          svgContent += `<line x1="${childPos.x}" y1="${midY}" x2="${childPos.x}" y2="${childPos.y}" stroke="#000"/>`;
        }
      });
    });
  
    // Después los nodos (rectángulos y texto)
    positions.forEach((pos, node) => {
      const { x, y } = pos;
      const name = node.name ?? 'Node';
      const lp = node.leftProbability?.toFixed(2) ?? '-';
      const rp = node.rightProbability?.toFixed(2) ?? '-';
      const la = node.leftAngle?.toFixed(2) ?? '-';
      const ra = node.rightAngle?.toFixed(2) ?? '-';
  
      svgContent += `
        <!-- Nodo ${name} -->
        <rect x="${x - nodeW/2}" y="${y}" width="${nodeW}" height="${nodeH + 20}"
              fill="#f0f0f0" stroke="#000"/>
        <rect x="${x - nodeW/2}" y="${y}" width="${nodeW}" height="20"
              fill="#dff0d8" stroke="#000"/>
        <text x="${x}" y="${y + 15}" font-size="12" font-weight="bold" text-anchor="middle">
          ${name}
        </text>
        <line x1="${x - nodeW/2}" y1="${y + 20}"
              x2="${x + nodeW/2}" y2="${y + 20}" stroke="#000"/>
        <line x1="${x - nodeW/2}" y1="${y + 40}"
              x2="${x + nodeW/2}" y2="${y + 40}" stroke="#000"/>
        <line x1="${x}" y1="${y + 20}"
              x2="${x}" y2="${y + nodeH + 20}" stroke="#000"/>
  
        <!-- Bits y propiedades -->
        <text x="${x - nodeW/4}" y="${y + 35}" font-size="12"
              text-anchor="middle">0</text>
        <text x="${x + nodeW/4}" y="${y + 35}" font-size="12"
              text-anchor="middle">1</text>
        <text x="${x - 40}" y="${y + 55}" font-size="12">${lp}</text>
        <text x="${x + 10}" y="${y + 55}" font-size="12">${rp}</text>
        <text x="${x - 40}" y="${y + 75}" font-size="12">${la}</text>
        <text x="${x + 10}" y="${y + 75}" font-size="12">${ra}</text>
      `;
    });
  
    // -----------------------
    // 3) ENVOLTORIO Y MEDIDAS
    // -----------------------
    const svgWidth  = startX + maxX;
    const svgHeight = (maxLevel + 1) * levelHeight + nodeH + 20;
  
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg"
           width="${svgWidth}" height="${svgHeight}"
           viewBox="0 0 ${svgWidth} ${svgHeight}">
        ${svgContent}
      </svg>`.trim();
  
    return { svg, width: svgWidth, height: svgHeight };
  }
  

  updateOutputs() {
    if(this.cambioInput) {
      this.mostrarTabla = false;
      this.cambioInput = false;
    }
    
    this.expectedFrequencies.setQubits(this.qubits)
    this.calculateShots()
    
    let shots = this.expectedFrequencies.getShots()
   // for (let i=0; i<this.expectedFrequencies.rows; i++)
     // this.relativeFrequencies.push(this.expectedFrequencies[i]*100/shots)
  }

  reset() {
    this.selectedOptionFreq = 'none'
    localStorage.setItem('selectedOptionFreq', this.selectedOptionFreq)
    this.isNone = true
    this.onOptionFreqChange(this.selectedOptionFreq)
    this.expectedFrequencies = new FreqTable()
    this.expectedFrequencies.setQubits(this.qubits)
    this.calculateShots()
    this.updateOutputs()
  }

  random(factor : number) {
    this.expectedFrequencies = new FreqTable()
    this.expectedFrequencies.setQubits(this.qubits)
    for (let i=0; i<this.expectedFrequencies.rows; i++) {
      if (this.isGrover) {
        this.expectedFrequencies.setFreq(i, Math.round(Math.random()*1*factor))
      } else {
        this.expectedFrequencies.setFreq(i, Math.round(Math.random()*100*factor))
      }
    }
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

  fixedAmount() {
    this.expectedFrequencies = new FreqTable()
    this.expectedFrequencies.setQubits(this.qubits)
    let selectedIndexes : number[] = []
    for (let i=0; i<this.amountOfValues; i++) {
      let index = Math.floor(Math.random() * this.expectedFrequencies.rows)
      while (selectedIndexes.includes(index)) {
        index = Math.floor(Math.random() * this.expectedFrequencies.rows)
      }
      selectedIndexes.push(index)
      if (this.isGrover) {
        this.expectedFrequencies.setFreq(index, 1)
      } else {
        this.expectedFrequencies.setFreq(index, 100)
      }
      
    }
  }

  withProb() {
    this.expectedFrequencies = new FreqTable()
    this.expectedFrequencies.setQubits(this.qubits)

    let numberOfIndexes = (1-this.probOf0) * this.expectedFrequencies.rows
    for (let i=0; i<numberOfIndexes; i++) {
      let index = Math.floor(Math.random() * this.expectedFrequencies.rows)
      this.expectedFrequencies.setFreq(index, Math.round(Math.random()*100))
    }
  
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

  showQuirk(index? : number) {
    if (index == undefined) 
      index = 0
    let url = "https://algassert.com/quirk#circuit=" + this.quirkCodes[index]
    window.open(url, "_blank")
  }    

  resetValues() {
    // Eliminar valores guardados en localStorage
    localStorage.removeItem('qubits');
    localStorage.removeItem('processedExpressionsDeterministic');
    localStorage.removeItem('matrix');
    localStorage.removeItem('selectedOptionFreq');
    localStorage.removeItem('mostrarTabla');
    localStorage.removeItem('selectedAlgorithm');
    location.reload();  // Reiniciar
  }

  validateInputs() {
    if (this.qubits === null || this.qubits === undefined) {
      this.error = 'Number of qubits is required';
      this.isInvalid = true;
      return;
    }

    if (this.qubits < 1 || this.qubits > 24) {
      this.error = 'Number of qubits must be between 1 and 24';
      this.isInvalid = true;
      return;
    }

    if (this.selectedAlgorithm === '') {
      this.error = 'Algorithm is required';
      this.isInvalid = true;
      return;
    }

    // Si todo está correcto
    this.error = '';
    this.isInvalid = false;
  }

  buildMatrixActions() {
    this.numberOfQubits = this.qubits;
    this.userExpressions = [];
    this.mostrarTabla = true;
    this.reset();
    localStorage.removeItem('processedExpressionsDeterministic');
    localStorage.removeItem('matrixDeterministic');

    localStorage.setItem('qubits', JSON.stringify(this.numberOfQubits));
    localStorage.setItem('mostrarTabla', JSON.stringify(this.mostrarTabla));
    localStorage.setItem('selectedAlgorithm', this.selectedAlgorithm);


    
    //this.getEmptyMatrix();
    // this.goToSpecifications();
    this.goToTable();
    // this.clearExpressions();
  }

  goToTable(): void {
    // Encontramos el elemento con el id 'myTable' y desplazamos la página hacia él
    const table = document.getElementById('myTable');
    if (table) {
      table.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  toggleTooltipTable(event: MouseEvent): void {
    //this.tooltipVisible = !this.tooltipVisible;
    event.stopPropagation();

    if (this.tooltipTableVisible) {
      this.tooltipTableVisible = false;
      this.tooltipVisible = false;
      this.tooltipPiVisible = false;
    } else {
      this.tooltipTableVisible = true;
      this.tooltipVisible = false;
      this.tooltipPiVisible = false;
    }
  }

  toggleTooltip(event: MouseEvent): void {
    //this.tooltipVisible = !this.tooltipVisible;
    event.stopPropagation();

    if (this.tooltipVisible) {
      this.tooltipVisible = false;
      this.tooltipTableVisible = false;
      this.tooltipPiVisible = false;
    } else {
      this.tooltipVisible = true;
      this.tooltipTableVisible = false;
      this.tooltipPiVisible = false;
    }
  }

  toggleTooltipPi(event: MouseEvent): void {
    //this.tooltipVisible = !this.tooltipVisible;
    event.stopPropagation();

    if (this.tooltipPiVisible) {
      this.tooltipPiVisible = false;
      this.tooltipVisible = false;
      this.tooltipTableVisible = false;
    } else {
      this.tooltipVisible = false;
      this.tooltipTableVisible = false;
      this.tooltipPiVisible = true;
    }
  }
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Verifica si el clic fue fuera del tooltip y el botón
    const tooltipElement = document.querySelector('.tooltip');
    const tooltipCustomElement = document.querySelector('.custom-tooltip');
    const buttonElement = document.querySelector('button');
    this.showRecommendations = false;
      
  
    if (this.tooltipVisible &&
        tooltipElement && !tooltipElement.contains(event.target as Node) &&
        buttonElement && !buttonElement.contains(event.target as Node)) {
      this.tooltipVisible = false;
    }
  
    if (this.tooltipTableVisible &&
      tooltipCustomElement && !tooltipCustomElement.contains(event.target as Node) &&
        buttonElement && !buttonElement.contains(event.target as Node)) {
      this.tooltipTableVisible = false;
    }

    if (this.tooltipPiVisible &&
      tooltipCustomElement && !tooltipCustomElement.contains(event.target as Node) &&
        buttonElement && !buttonElement.contains(event.target as Node)) {
      this.tooltipTableVisible = false;
    }
  }
    
  onParallelCircuitsChange(): void {
    if (this.inParallel) {
      this.splitCircuits = false;
    }
  }

  // Se llama al cambiar el checkbox de “Split in several circuits”
  onSplitCircuitsChange(): void {
    if (this.splitCircuits) {
      this.inParallel = false;
    }
  }

  onAlgorithmChange(value: string): void {
    this.selectedAlgorithm = value;
    this.mostrarTabla = false;
    this.isGrover = value === 'grover';
    this.isGrenoble = value === 'grenoble';
    this.isOriginalGR = value === 'originalGR';
  }

  onQuirkChange(index: number): void {
    this.selectedQuirk = index;
  }  

  isAddDisabled(): boolean {
    return !this.currentUserExpression || this.currentUserExpression.trim() === '';
  }

  onOptionFreqChange(value: string): void {
    
    this.isNone = value === 'none';
    this.isRandom = value === 'random';
    this.isRandom10 = value === 'random10';
    this.isZeroTo2N = value === 'zeroTo2N';
    this.isProbabilityOf0 = value === 'probabilityOf0';
    this.isAmountOfValues = value === 'amountOfValues';
  }

  applyOption() {
    if (this.isNone) {
      this.reset();
    } else if (this.isRandom) {
      this.random(1);
    } else if (this.isRandom10) {
      this.random(10);
    } else if (this.isZeroTo2N) {
      this.zeroTo2N();
    } else if (this.isProbabilityOf0) {
      this.withProb();
    } else if (this.isAmountOfValues) {
      this.fixedAmount();
    }

    localStorage.setItem('selectedOptionFreq', this.selectedOptionFreq);

    this.updateTotalSelectedElements();
  }


  validateGroverValue(event: any, rowIndex: number): void {
    const value = parseInt(event.target.value, 10);
    if (value !== 0 && value !== 1) {
      event.target.value = 0;
      this.setFreq({ target: { value: 0 } }, rowIndex);
    }
  }

  changeRowValue(rowIndex: number, event: any): void {
    if(this.isGrover) {
      if (this.expectedFrequencies.getFreq(rowIndex) === 0) {
        event.target.value = 1;
        this.setFreq({ target: { value: 1 } }, rowIndex);
      } else if (this.expectedFrequencies.getFreq(rowIndex) === 1) {
        event.target.value = 0;
        this.setFreq({ target: { value: 0 } }, rowIndex);
      }
    }
    this.updateTotalSelectedElements();
  }

  clearExpressions() {
    this.userExpressions = [];
  }



  // Modales

  toggleEjemplos() {
    this.mostrarEjemplos = !this.mostrarEjemplos;
  }

  onAddExampleClick(i: number): void {
    this.addExample(i);
    this.mensajeTemporal = 'Example added';
    setTimeout(() => {
        this.mensajeTemporal = '';
    }, 2000);
  }

  addExample(index: number): void {
    this.error = undefined;
    this.reset();

    // Eliminar todas las expresiones antes de agregar nuevas
    this.userExpressions = [];

    let exprs = this.javaExamples[index].exprs;

    for (let i = 0; i < exprs.length; i++) {
        if (exprs[i].trim().length === 0) continue;

        // Agrega la expresión a la lista
        this.userExpressions.push(exprs[i]);
    }

    if (exprs.length > 0) {
        this.currentUserExpression = exprs[0];
    }

    // Limpiar el campo de texto
    this.currentUserExpression = "";
  }

  openTextArea(c : DeterministicComponent, e : Event, title : string, elementIndex? : number) {
    let caja = e.target as any
    this.createDialog(c, caja, title, elementIndex)
    this.dialogo.showModal()
    let textoDialogo = this.dialogo.getElementsByTagName("textarea")[0];
    textoDialogo.value = caja!.value;
    this.dialogo.getElementsByTagName("textarea")[0].focus();
  }

  protected createDialog(cc: DeterministicComponent, caja: any, title: string, parameterIndex? : number) {
    let selfCaja = caja
    let textArea: any
    if (!this.dialogo) {
        this.dialogo = document.createElement("dialog")
        this.dialogo.setAttribute("id", "dialogo");

        // Estilos para el modal
        this.dialogo.style.backgroundColor = "#eaf7f7";
        this.dialogo.style.borderRadius = "12px";
        this.dialogo.style.padding = "20px";
        this.dialogo.style.maxWidth = "80%";
        this.dialogo.style.boxShadow = "0px 10px 30px rgba(0, 0, 0, 0.2)";
        this.dialogo.style.position = "relative";
        this.dialogo.style.border = "2px solid #007d86";

        // Crear y configurar el título
        let label = document.createElement("strong")
        label.innerHTML = title + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"

        // Crear y configurar la "X" para cerrar el modal
        let a = document.createElement("u")
        a.innerHTML = "&times;"
        a.style.fontSize = "24px";
        a.style.position = "absolute";
        a.style.top = "10px";
        a.style.right = "10px";
        a.style.cursor = "pointer";

        let self = this
        a.onclick = function() {
            selfCaja.parentElement.removeChild(self.dialogo)
            self.dialogo = null
            selfCaja.focus()
        }

        // Agregar el título y la "X" al modal
        this.dialogo.appendChild(label)
        this.dialogo.appendChild(a)

        this.dialogo.appendChild(document.createElement("br"))

        // Crear y configurar el textarea
        textArea = document.createElement("textarea");
        textArea.style.width = "95%";
        textArea.style.height = "150px";
        textArea.style.padding = "10px";
        textArea.style.fontSize = "16px";
        textArea.style.borderRadius = "8px";
        textArea.style.border = "2px solid #ccc";
        textArea.style.backgroundColor = "#f9f9f9";
        textArea.style.boxShadow = "0px 4px 8px rgba(0, 0, 0, 0.1)";
        textArea.style.transition = "all 0.3s ease";
        textArea.style.border = "2px solid #007d86";

        this.dialogo.appendChild(textArea);
        textArea.setAttribute("placeholder", "Write expressions in different lines. For example:\n\nq3 == 1\n" +
            "q4 == 0\ninput%2 == 0\n")
        textArea.setAttribute("rows", "15");
        textArea.setAttribute("cols", "60");
        textArea.ondblclick = function() {
            textArea.value = "q3 == 1\nq4 == 0\ninput%2 == 0\n"
        }

        // Crear y configurar el botón "Add"
        let addButton = document.createElement("button");
        addButton.innerHTML = "Add";
        addButton.style.marginTop = "10px";
        addButton.style.padding = "8px 15px";
        addButton.style.borderRadius = "5px";
        addButton.style.border = "1px solid #ccc";
        addButton.style.backgroundColor = "#008b95";
        addButton.style.color = "#fff";
        addButton.style.fontSize = "16px";
        addButton.style.cursor = "pointer";

        addButton.addEventListener("mouseenter", () => {
          addButton.style.backgroundColor = "#006f78";
          addButton.style.transform = "scale(1.05)";
          addButton.style.transition = "all 0.3s ease";
      });

      addButton.addEventListener("mouseleave", () => {
          addButton.style.backgroundColor = "#008b95";
          addButton.style.transform = "scale(1)";
      });

        addButton.onclick = function() {
            if (textArea!.value.trim().length > 0) {
                let expressions = textArea!.value.split("\n")
                for (let i = 0; i < expressions.length; i++) {
                    if (expressions[i].trim().length == 0)
                        continue
                    self.currentUserExpression = expressions[i]
                    self.addUserExpression()
                }
            }
            selfCaja.parentElement.removeChild(self.dialogo)
            self.dialogo = null
            selfCaja.focus()
        }

        this.dialogo.appendChild(addButton);
    }

    caja.parentElement.appendChild(this.dialogo);
  }

  onSearchInput() {

    this.currentUserExpression = this.searchQuery;  // Mantiene ambas variables sincronizadas
    
    this.filteredExpressions = [...this.expressions];
    
    if (this.searchQuery.trim() != "") {

      this.filteredExpressions = this.expressions.filter(exp =>
        exp.type === 'grover' && 
        (exp.jsExpression.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        exp.expressionName.toLowerCase().includes(this.searchQuery.toLowerCase()))
      );

      
    const foundExpression = this.manager.expressions.find(exp =>
      exp.type === 'grover' &&
      exp.expressionName.toLowerCase() === this.searchQuery.toLowerCase()
    );

    // if (foundExpression) {
    //     console.log("Expression found:", foundExpression);
    // }
    
    if (foundExpression) {
        this.recommendation = `${foundExpression.jsExpression}`;
        this.showRecommendations = true;
    }

    }
  }


  searchExpressions() {
    this.filteredExpressions = this.expressions;

    if (this.searchQuery.trim() != ""){
      this.filteredExpressions = this.expressions.filter(exp =>
        exp.type === 'grover' &&
        exp.expressionName.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
  }



  // Recommendations

  checkForExpressions() {

    if (!this.currentUserExpression || !this.currentUserExpression.trim()) {
      this.showRecommendations = false;
      return;
    }

    if (!this.currentUserExpression.trim()) {
      this.showRecommendations = false;
      return;
    }

    this.checkForOrExpression();
    this.checkForAndExpression();
    this.isPrimeNumber();
    this.isEvenNumber();
    this.sumQubits();
    this.xorExpression();
    this.isPowerOfTwo();
  }

  onTabPress(event: KeyboardEvent) {
    if (event.key === 'Tab' && this.showRecommendations) {
      this.searchQuery = this.recommendation;
      this.showRecommendations = false;
    }
  }

  onFocusInput() {
    this.checkForExpressions();
  }

  copiarCodigo() {
    const codigo = this.qiskitCode ? this.qiskitCode.lines.join('\n') : '';
    navigator.clipboard.writeText(codigo).then(() => {
      alert('Code copied to clipboard');
        }).catch(err => {
          console.error('Error copying code: ', err);
      });
  }

  guardarCodigo() {
    this.mostrarModalGuargarCode = true;
    this.mostrarModalNombreFuncion = false;
    this.mostrarModal = false;
  }
  // Expressions actions

  create() {
    this.creatingExpression = true;
    this.mostrarModalCrearExp = true;
    this.mostrarModalVerExp = false;
    // this.manager.selectedTemplate = new CodeTemplate("", "", "")
  }

  save() {
    if (this.isValid()) {
      
      const existingExpressionIndex = this.expressions.findIndex(exp => exp.expressionName === this.expressionToSave.expressionName);

      if (existingExpressionIndex !== -1) {
          // Si la expresión existe, actualizamos los datos
          if (this.fromEdit) {
            
            const updatedExpression = { ...this.expressions[existingExpressionIndex], ...this.expressionToSave };

            this.expService.updateExpression(updatedExpression).subscribe(
              data => {
                // Actualizamos la expresión en el array
                this.expressions[existingExpressionIndex] = data;

                // Ordenamos las expresiones por nombre
                this.expressions.sort((a, b) => a.expressionName.localeCompare(b.expressionName));

                // Limpiamos el formulario y cerramos el modal
                this.expressionToSave = { expressionName: '', jsExpression: '', description: '', type: 'grover' };
                this.creatingExpression = false;
                this.mostrarModalCrearExp = false;
                this.mensajeTemporal = 'Expression updated successfully';
                setTimeout(() => {
                  this.mensajeTemporal = '';
                }, 2000);
              },
              error => {
                console.error(error);
              }
            );
            this.fromEdit = false;
            this.isNameDisabled = false;
          } else {
            // Si la expresión existe y no estamos editando, mostramos un mensaje de error
            alert("Expression with this name already exists. Please choose a different name.");
          }      
        } else {
            // Si la expresión no existe, creamos una nueva
            this.expService.createExpression({
              expressionName: this.expressionToSave.expressionName,
              jsExpression: this.expressionToSave.jsExpression,
              description: this.expressionToSave.description,
              type: 'grover'
            }).subscribe(
                data => {
                    // Aseguramos que `this.expressions` esté inicializado
                    if (!this.expressions) {
                        this.expressions = [];
                    }

                    // Agregar la nueva expresión a la lista
                    this.expressions.push(data);
                    this.expressions.sort((a, b) => a.expressionName.localeCompare(b.expressionName));

                    // Limpiamos el formulario y cerramos el modal
                    this.expressionToSave = { expressionName: '', jsExpression: '', description: '', type: 'grover' };
                    this.creatingExpression = false;
                    this.mostrarModalCrearExp = false;
                    this.mensajeTemporal = 'Expression created successfully';
                    setTimeout(() => {
                      this.mensajeTemporal = '';
                    }, 2000);
                },
                error => {
                    console.error(error);
                }
            );
        }
    }
  }

  isValid() {
    return this.expressionToSave.expressionName && this.expressionToSave.jsExpression;
  }

  saveUserExpression(index: number) {
    this.expressionToSave.jsExpression = this.userExpressions[index];
    this.expressionToSave.type = 'grover';
    this.mostrarModalCrearExp = true;
  }

  editExpression(expression: any, index: number) {
    this.expressionToSave = { ...expression };
    this.fromEdit = true;
    this.isNameDisabled = true;
    this.mostrarModalCrearExp = true;
    this.mostrarModalVerExp = false;
  }

  openDeleteModal(expression: any, index: number) {
    this.expressionToDelete = expression;
    this.deleteIndex = index;
    this.showDeleteModal = true;
  }

  // Confirmar eliminación
  confirmDelete() {
    if (!this.expressionToDelete) return;

    this.expService.deleteExpression(this.expressionToDelete).subscribe(
      () => {
        if (!this.expressions) {
          this.expressions = [];
        }

        this.expressions.splice(this.deleteIndex, 1);
        this.expressions.sort((a, b) => a.expressionName.localeCompare(b.expressionName));
        this.searchExpressions();

        this.cancelDelete(); // cerrar el modal

        this.mensajeTemporal = 'Expression deleted successfully';
        setTimeout(() => {
          this.mensajeTemporal = '';
        }, 2000);
      },
      error => {
        console.error("Error deleting expression:", error);
        alert("Failed to delete the expression. Please try again.");
        this.cancelDelete();
      }
    );
  }

  // Cancelar
  cancelDelete() {
    this.showDeleteModal = false;
    this.expressionToDelete = null;
    this.deleteIndex = -1;
  }

  showExpressions() {
    this.mostrarModalVerExp = true;
  }

  selectRecommendation() {
    this.currentUserExpression = this.recommendation;
    this.showRecommendations = false;
    this.searchQuery = this.currentUserExpression;
  }


  checkForOrExpression() {
    if (this.currentUserExpression.includes('||') && this.currentUserExpression !== this.recommendation) {
      this.recommendOrExpression();
    }
  }

  recommendOrExpression() {
    const qubitIndices = [];
  
    for (let i = 0; i < this.qubits; i++) {
      qubitIndices.push(`q${i}`);
    }
  
    const orExpression = `[${qubitIndices.join(', ')}].map(Number).reduce((a, b) => a | b, 0) == 1`;
  
    this.recommendation = orExpression;
    this.showRecommendations = true;
  }

  checkForAndExpression() {
    if (this.currentUserExpression.includes('&&') && this.currentUserExpression !== this.recommendation) {
      this.recommendAndExpression();
    }
  }

  recommendAndExpression() {
    const qubitIndices = [];
  
    for (let i = 0; i < this.qubits; i++) {
      qubitIndices.push(`q${i}`);
    }
  
    const andExpression = `[${qubitIndices.join(', ')}].map(Number).reduce((a, b) => a & b, 1) == 1`;
  
    this.recommendation = andExpression;
    this.showRecommendations = true;
  }  

  isPrimeNumber() {
    if (/is\s*prime/i.test(this.currentUserExpression) && this.currentUserExpression !== this.recommendation) {
      this.recommendIsPrimeExpression();
    }
  }

  recommendIsPrimeExpression() {
    const qubitIndices = [];
  
    for (let i = 0; i < this.qubits; i++) {
      qubitIndices.push(`q${i}`);
    }
  
    const binaryToDecimal = `parseInt([${qubitIndices.join(', ')}].join(''), 2)`;
  
    const isPrimeLogic = `(function(n) {
      if (n < 2) return false;
      for (let i = 2; i * i <= n; i++) {
        if (n % i === 0) return false;
      }
      return true;
    })(${binaryToDecimal}) == true`;
  
    this.recommendation = isPrimeLogic;
    this.showRecommendations = true;
  }
  

  isEvenNumber() {
    if (this.currentUserExpression.includes('isEven') && this.currentUserExpression !== this.recommendation) {
      this.recommendIsEvenExpression();
    }
  }

  recommendIsEvenExpression() {
    const qubitIndices = [];
  
    for (let i = 0; i < this.qubits; i++) {
      qubitIndices.push(`q${i}`);
    }
  
    const binaryToDecimal = `parseInt([${qubitIndices.join(', ')}].map(Number).join(''), 2)`;
  
    const isEvenExpression = `(${binaryToDecimal} % 2 == 0)`;
  
    this.recommendation = isEvenExpression;
    this.showRecommendations = true;
  }
  

  sumQubits() {
    if (this.currentUserExpression.includes('sum') && this.currentUserExpression !== this.recommendation) {
      this.recommendSumQubitsExpression();
    }
  }
  
  // Comprueba si la suma es 1 (si hay solo un 1 en los qubits)
  recommendSumQubitsExpression() {
    const qubitIndices = [];
  
    for (let i = 0; i < this.qubits; i++) {
      qubitIndices.push(`q${i}`);
    }
  
    const sumExpression = `[${qubitIndices.join(', ')}].map(Number).reduce((a, b) => a + b, 0) == 1`;
  
    this.recommendation = sumExpression;
    this.showRecommendations = true;
  }
  

  xorExpression() {
    if (this.currentUserExpression.includes('xor') && this.currentUserExpression !== this.recommendation) {
      this.recommendXorExpression();
    }
  }

  recommendXorExpression() {
    const qubitIndices = [];
  
    for (let i = 0; i < this.qubits; i++) {
      qubitIndices.push(`q${i}`);
    }
  
    const xorExpression = `[${qubitIndices.join(', ')}].map(Number).reduce((a, b) => a ^ b, 0) == 1`;
  
    this.recommendation = xorExpression;
    this.showRecommendations = true;
  }  

  isPowerOfTwo() {
    if (this.currentUserExpression.includes('two') && this.currentUserExpression !== this.recommendation) {
      this.recommendIsPowerOfTwoExpression();
    }
  }

  recommendIsPowerOfTwoExpression() {
    const qubitIndices = [];
  
    for (let i = 0; i < this.qubits; i++) {
      qubitIndices.push(`q${i}`);
    }
  
    const binaryToDecimal = `parseInt([${qubitIndices.join(', ')}].join(''), 2)`;
  
    const isPowerOfTwoExpression = `(function(n) { return (n > 0 && (n & (n - 1)) === 0); })(${binaryToDecimal}) == true`;
  
    this.recommendation = isPowerOfTwoExpression;
    this.showRecommendations = true;
  }
  
  isGroverOption (): boolean {
    return this.isGrover;
  }

  updateTotalSelectedElements(): void {
    const totalRows = Math.min(this.expectedFrequencies.rows, this.maxRows);
    this.totalSelectedElements = 0;

    for (let i = 0; i < totalRows; i++) {
      if (this.expectedFrequencies.getFreq(i) === 1) {
        this.totalSelectedElements++;
      }
    }
  }


}
