import { Component, HostListener, ViewChild, AfterViewInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GroverService } from '../grover.service';
import { GroverStyle } from '../common/GroverStyleComponent';
import { ManagerService } from '../manager.service';
import { CodeTemplate } from '../templates/CodeTemplate';
import { QiskitCode } from './QiskitCode';
import { QiskitService } from '../qiskit.service';
import { EditorComponent } from '../editor/editor.component';
import { Expression } from '../matrixes/Expression';
import { ExpressionsService } from '../expressions.service';

@Component({
  selector: 'app-grover',
  templateUrl: './grover.component.html',
  styleUrls: ['./grover.component.css']
})
export class GroverComponent extends GroverStyle  implements AfterViewInit {

  @ViewChild(EditorComponent) editor!: EditorComponent;
  
    someMethodInMatrixes() {
      console.log('Método en grover llamado');
    }
  
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

  cols: number = 0
  rows: number = 0

  startMatrix?: any[]

  quirkURL?: SafeResourceUrl
  finalQiskitGate?: string
  qiskitMatrix?: any
  values?: number[]

  useMCX : boolean = false

  max: number = 50000




  mensajeTemporal: string = '';
  numberOfQubits : number | null = null;
  isInvalid: boolean = true;
  dialogo : any = undefined
  mostrarModalVerExp: boolean = false;
  filteredExpressions: Expression[] = [];
  expressions: Expression[] = [];
  searchQuery: string = "";
  selectedExpressionIndex: number | null = null;
  buscarBtn: boolean = false;
  recommendation: string = '';
  showRecommendations: boolean = false;
  tooltipVisible: boolean = false;
  tooltipTableVisible: boolean = false;
  mostrarInstrucciones: boolean = false;
  mostrarEjemplos: boolean = false;


  constructor(protected groverService: GroverService, protected override qiskitService : QiskitService, 
    public sanitizer: DomSanitizer, public manager : ManagerService, public service : ExpressionsService) {
    super(qiskitService)
  }

  ngOnInit() {
    // Valida cuando se inicializan los valores
    this.validateInputs();

    // this.service.getExpressions().subscribe((data: Expression[]) => {
    //   this.expressions = data;
    // });

    this.service.getExpressions().subscribe((data: Expression[]) => {
      this.expressions = data.filter(exp => exp.type === 'grover');
    });
    

    // Recuperar valores desde localStorage con valores por defecto
    this.qubits = JSON.parse(localStorage.getItem('qubits') || '4');


    // Verificar si hay datos guardados
    const savedQubits = localStorage.getItem('qubits');
    const savedUserExpressions = localStorage.getItem('processedExpressionsGrover');



    if (savedQubits) {
        this.buildMatrixActions();
        setTimeout(() => {

            if (savedUserExpressions) {
              // Agregar expresiones guardadas al sistema
              this.userExpressions = JSON.parse(savedUserExpressions);
              this.fillTableWithUserExpressions();
              
          }
        }, 50);

    }

  }

  override tryFill(index: number): void {
    this.reset()
    let exprs = this.javaExamples[index].exprs

    this.userExpressions = []
    this.userExpressions = this.userExpressions.concat(exprs)
    
    
    // this.markElementsWithUserExpressions()
    this.fillTableWithUserExpressions()
  }

  fillTable(marking : boolean) {
    if (this.userExpressions.length == 0)
      throw Error("There are no expressions to fill-in the table")
    if (!this.matrix)
      throw Error("There is no matrix")

    const maxQubit = this.qubits + 1;
    
    const qnValue = `q${this.qubits + 1}`;

    const processedExpressions = this.userExpressions.map(expr =>
      expr.replace(/\bqn\b/g, qnValue)
    );

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

      localStorage.setItem('qubits', JSON.stringify(this.qubits));
      localStorage.setItem('processedExpressionsGrover', JSON.stringify(processedExpressions));
      localStorage.setItem('matrix', JSON.stringify(this.matrix));
      // localStorage.setItem('processedExpressions', JSON.stringify(processedExpressions));
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

    localStorage.setItem('matrix', JSON.stringify(this.matrix));
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









  goToTable(): void {
    // Encontramos el elemento con el id 'myTable' y desplazamos la página hacia él
    const table = document.getElementById('myTable');
    if (table) {
      table.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  validateInputs() {
    if (this.qubits === null || this.qubits === undefined) {
      this.error = 'Number of qubits is required';
      this.isInvalid = true;
      return;
    }

    if (this.qubits < 2 || this.qubits > 12) {
      this.error = 'Number of qubits must be between 2 and 12';
      this.isInvalid = true;
      return;
    }

    // Si todo está correcto
    this.error = '';
    this.isInvalid = false;
  }

  buildMatrixActions() {
    this.numberOfQubits = this.qubits;

    localStorage.removeItem('processedExpressionsGrover');
    localStorage.removeItem('matrix');

    localStorage.setItem('qubits', JSON.stringify(this.numberOfQubits));

    this.getEmptyMatrix();
    // this.goToSpecifications();
    this.goToTable();
    // this.clearExpressions();
  }

  isAddDisabled(): boolean {
    return !this.currentUserExpression || this.currentUserExpression.trim() === '';
  }

  openTextArea(c : GroverComponent, e : Event, title : string, elementIndex? : number) {
    let caja = e.target as any
    this.createDialog(c, caja, title, elementIndex)
    this.dialogo.showModal()
    let textoDialogo = this.dialogo.getElementsByTagName("textarea")[0];
    textoDialogo.value = caja!.value;
    this.dialogo.getElementsByTagName("textarea")[0].focus();
  }

  protected createDialog(cc: GroverComponent, caja: any, title: string, parameterIndex? : number) {
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
        exp.type === 'matrixes' && 
        (exp.jsExpression.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        exp.expressionName.toLowerCase().includes(this.searchQuery.toLowerCase()))
      );

      
    const foundExpression = this.manager.expressions.find(exp =>
      exp.type === 'matrixes' &&
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
        exp.type === 'matrixes' &&
        exp.expressionName.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
  }


  toggleTooltipTable(event: MouseEvent): void {
    //this.tooltipVisible = !this.tooltipVisible;
    event.stopPropagation();

    if (this.tooltipTableVisible) {
      this.tooltipTableVisible = false;
      this.tooltipVisible = false;
    } else {
      this.tooltipTableVisible = true;
      this.tooltipVisible = false;
    }
  }

  toggleTooltip(event: MouseEvent): void {
    //this.tooltipVisible = !this.tooltipVisible;
    event.stopPropagation();

    if (this.tooltipVisible) {
      this.tooltipVisible = false;
      this.tooltipTableVisible = false;
    } else {
      this.tooltipVisible = true;
      this.tooltipTableVisible = false;
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
  }

  resetValues() {
    // Eliminar valores guardados en localStorage
    localStorage.removeItem('qubits');
    localStorage.removeItem('processedExpressionsGrover');
    localStorage.removeItem('matrix');

    location.reload();  // Reiniciar
  }

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

    // Si deseas actualizar la variable `currentUserExpression`
    if (exprs.length > 0) {
        this.currentUserExpression = exprs[0];
    }

    // Limpiar el campo de texto
    this.currentUserExpression = "";


  }

}
