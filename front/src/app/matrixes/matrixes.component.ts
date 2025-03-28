import { Component, HostListener } from '@angular/core';
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

  mensajeTemporal: string = '';
  showHelp = false;
  isDisabled = false;
  isDisabled2 = false;

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

  constructor(private quirkService : QuirkService, private qiskitService : QiskitService, private fillingService : FillingService, 
    public sanitizer : DomSanitizer, public manager : ManagerService) {}

  addUserExpression(): void {
    this.error = undefined
    if (this.currentUserExpression.trim().length==0) {
      this.error = "Write some expression"
      return
    }
    this.userExpressions.push(this.currentUserExpression)

    // Limpiar el campo de texto
    this.currentUserExpression = "";
  }

  openTextArea(c : MatrixesComponent, e : Event, title : string, elementIndex? : number) {
    let caja = e.target as any
    this.createDialog(c, caja, title, elementIndex)
    this.dialogo.showModal()
    let textoDialogo = this.dialogo.getElementsByTagName("textarea")[0];			
    textoDialogo.value = caja!.value;
    this.dialogo.getElementsByTagName("textarea")[0].focus();
  }

  // protected createDialog(cc : MatrixesComponent, caja : any, title : string, parameterIndex? : number) {
  //   let selfCaja = caja
  //   let textArea : any
  //   if (!this.dialogo) {
  //       this.dialogo = document.createElement("dialog")
  //       this.dialogo.setAttribute("id", "dialogo");
  //       let label = document.createElement("strong")
  //       label.innerHTML = title + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
  //       let a = document.createElement("u")
  //       a.innerHTML = "Close"
  //       let self = this
  //       a.onclick = function() {
  //           if (textArea!.value.trim().length>0) {
  //               let expressions = textArea!.value.split("\n")
  //               for (let i=0; i<expressions.length; i++) {
  //                 if (expressions[i].trim().length==0)
  //                   continue
  //                 self.currentUserExpression = expressions[i]
  //                 self.addUserExpression()
  //               }
  //           }

  //           selfCaja.parentElement.removeChild(self.dialogo)
  //           self.dialogo = null
  //           selfCaja.focus()
  //       }
  //       this.dialogo.appendChild(label)
  //       this.dialogo.appendChild(a)

  //       this.dialogo.appendChild(document.createElement("br"))
  //       textArea = document.createElement("textarea"); 
  //       this.dialogo.appendChild(textArea);
  //       textArea.setAttribute("placeholder", "Write expressions in different lines. For example:\n\nq3 = q0\n" + 
  //         "q4 = q1\nq5 = (q0&&q1)^q2\n")
  //       textArea.setAttribute("rows", "15");
  //       textArea.setAttribute("cols", "60");
  //       textArea.ondblclick = function() {
  //         textArea.value = "q3 = q0\nq4 = q1\nq5 = (q0&&q1)^q2\n"
  //       }

  //   }
  //   caja.parentElement.appendChild(this.dialogo);
  // }

  protected createDialog(cc: MatrixesComponent, caja: any, title: string, parameterIndex? : number) {
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
            // if (textArea!.value.trim().length > 0) {
            //     let expressions = textArea!.value.split("\n")
            //     for (let i = 0; i < expressions.length; i++) {
            //         if (expressions[i].trim().length == 0)
            //             continue
            //         self.currentUserExpression = expressions[i]
            //         self.addUserExpression()
            //     }
            // }
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
        textArea.setAttribute("placeholder", "Write expressions in different lines. For example:\n\nq3 = q0\n" +
            "q4 = q1\nq5 = (q0&&q1)^q2\n")
        textArea.setAttribute("rows", "15");
        textArea.setAttribute("cols", "60");
        textArea.ondblclick = function() {
            textArea.value = "q3 = q0\nq4 = q1\nq5 = (q0&&q1)^q2\n"
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


  removeUserExpression(index : number) {
    this.userExpressions.splice(index, 1)
  }

  saveUserExpression(index : number) {
    // this.userExpressions.splice(index, 1)
  }

  fillTableWithUserExpressions() {
    this.error = undefined
    if (this.userExpressions.length==0) {
      this.error = "There are no expressions to fill-in the table"
      this.mensajeTemporal = 'There are no expressions to fill-in the table';
      setTimeout(() => {
        this.mensajeTemporal = '';
      }, 2000);
        
      return
    }
    this.reset()

    // Calculamos el valor de qn
    const qnValue = `q${this.inputQubits + this.outputQubits - 1}`;

    // Reemplazamos todas las ocurrencias de "qn" en cada expresión
    const processedExpressions = this.userExpressions.map(expr =>
        expr.replace(/\bqn\b/g, qnValue)
    );

    try {
      let matrix = this.fillingService.fillTable(processedExpressions, this.inputQubits, this.outputQubits)
      this.rows = matrix.length
      this.cols = matrix[0].length
      this.load(matrix)


      this.goToTable();
    } catch (error) {
      this.error = error

      this.mensajeTemporal = 'The expression is not valid';
      setTimeout(() => {
          this.mensajeTemporal = '';
      }, 2000);
    }
  }

  tryFill(index : number) {
    this.reset()
    let exprs = this.javaExamples[index].exprs
    let matrix = this.fillingService.fillTable(exprs, this.inputQubits, this.outputQubits)
    this.rows = matrix.length
    this.cols = matrix[0].length
    this.load(matrix)

    this.javaExamples[index].attempted = true;
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


  //mio
  mostrarModalNombreFuncion = false;
  nombreFuncion = '';
  matrixTmp: any[] = [];
  asFunctionTmp = false;
  rowIndexTmp?: number;

  getQiskitCode(matrix : any[], asFunction : boolean, rowIndex? : number) {
    let functionName
    if (asFunction) {
      // functionName = prompt("Enter the name of the function")
      // if (!functionName || functionName.trim().length==0) {
      //   this.error = "You must enter a name for the function"
      //   return
      // }
      // if (this.isDisabled) return;
      // this.isDisabled = true;
      // if (this.isDisabled2) return;
      // this.isDisabled2 = true;

      this.matrixTmp = matrix;
      this.asFunctionTmp = asFunction;
      this.rowIndexTmp = rowIndex;
      this.nombreFuncion = '';
      this.error = '';
      this.mostrarModalNombreFuncion = true;
      return;
    }
    this.reset()
    let info = {
      matrix : matrix,
      inputQubits : this.inputQubits,
      qubits : this.inputQubits + this.outputQubits,
      reduce : this.reduceQuiskit,
      domain : this.domain,
      template : this.manager.selectedTemplate,
      functionName : functionName
    }
    if (rowIndex!=undefined)
      info.matrix = matrix[rowIndex]
    this.qiskitService.getCode(info).subscribe(
      result => {
        this.qiskitCode = result.code
        this.replaceShotsToken(1000)


        // Mostrar modal solo si el usuario ingresó un nombre válido
        if (asFunction) {
          this.mostrarModal = true;
        }
      }
    )
  }




  confirmarNombreFuncion() {
    if (!this.nombreFuncion.trim()) {
      this.error = "You must enter a name for the function";
      return;
    }
  
    this._getQiskitCode(this.matrixTmp, this.asFunctionTmp, this.rowIndexTmp, this.nombreFuncion);
    this.cancelarModal();
  }
  
  cancelarModal() {
    this.mostrarModalNombreFuncion = false;
    this.error = '';
  }
  
  private _getQiskitCode(matrix: any[], asFunction: boolean, rowIndex: number | undefined, functionName?: string) {
    if (this.isDisabled || this.isDisabled2) return;
    this.isDisabled = true;
    this.isDisabled2 = true;
  
    this.reset();
  
    let info = {
      matrix: matrix,
      inputQubits: this.inputQubits,
      qubits: this.inputQubits + this.outputQubits,
      reduce: this.reduceQuiskit,
      domain: this.domain,
      template: this.manager.selectedTemplate,
      functionName: functionName
    };
  
    if (rowIndex !== undefined) info.matrix = matrix[rowIndex];
  
    this.qiskitService.getCode(info).subscribe(result => {
      this.qiskitCode = result.code;
      this.replaceShotsToken(1000);
      this.mostrarModal = true;
    });
  }


  //mio


  replaceShotsToken(shots : any) {
    if (!this.qiskitCode)
      return
    for (let i=0; i<this.qiskitCode.length; i++)
      this.qiskitCode[i] = this.qiskitCode[i].replace("#SHOTS#", "1000")
  }

  addHadamardGates() {

    if (this.isDisabled) return; // Si ya está deshabilitado, no hace nada
    this.isDisabled = true;


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


    this.mensajeTemporal = 'Added Hadamard gates!';
    setTimeout(() => {
        this.mensajeTemporal = '';
    }, 2000); // Se oculta después de 2 segundos
  }

  countLastQubit() {
    
    if (this.isDisabled2) return; // Si ya está deshabilitado, no hace nada
    this.isDisabled2 = true;

    let code = [ "counts_output_qubit" + " = absolute_frequencies.get('1', 1)\n",
      "probability_output_qubit = counts_output_qubit / 1000\n",
      "result" + " = " + (2**this.inputQubits) + " * probability_output_qubit\n",
      "print(f\"Probability of getting 1 in the output qubit: {result}\")"
    ]
    for (let i=0; i<code.length; i++)
      this.qiskitCode?.push(code[i])   
    
    

    this.mensajeTemporal = 'Counted last qubit!';
    setTimeout(() => {
        this.mensajeTemporal = '';
    }, 2000);
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




  isInvalid: boolean = true;

  ngOnInit() {
    // Valida cuando se inicializan los valores
    this.validateInputs();
    // this.recommendOrExpression();
  }

  validateInputs() {
    if (this.inputQubits === null || this.outputQubits === null) {
      this.error = 'Both fields are required';
      this.isInvalid = true;
      return;
    }

    if (this.inputQubits < 2 || this.inputQubits > 15) {
      this.error = 'Input qubits must be between 2 and 15';
      this.isInvalid = true;
      return;
    }

    if (this.outputQubits < 0) {
      this.error = 'Output qubits must be 0 or more';
      this.isInvalid = true;
      return;
    }

    // Si todo está correcto
    this.error = '';
    this.isInvalid = false;
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
  
  goToSpecifications(): void {
    const specifications = document.getElementById('specifications');
    if (specifications) {
      specifications.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  onTryClick(i: number): void {
    this.tryFill(i);
    this.goToTable();
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

  onAddExample2Click(expr: string): void {
    this.addExample2(expr);
  }

  addExample2(expression: string): void {
    this.error = undefined;
    this.reset();

    // Agrega la expresión completa en lugar de iterar sobre caracteres
    if (expression.trim().length > 0) {
      this.userExpressions.push(expression);
    }

    // Si deseas actualizar `currentUserExpression`
    this.currentUserExpression = expression;

    // Limpiar el campo de texto
    this.currentUserExpression = "";

    this.mensajeTemporal = 'Expression added';
    setTimeout(() => {
        this.mensajeTemporal = '';
    }, 2000);
  }


  numberOfInputQubits : number | null = null;
  numberOfOutputQubits : number | null = null;

  buildMatrixActions() {
    this.numberOfInputQubits = this.inputQubits;
    this.numberOfOutputQubits = this.outputQubits;
    this.getEmptyMatrix();
    // this.goToSpecifications();
    this.goToTable();
    this.clearExpressions();
  }


  mostrarModal: boolean = false;

  copiarCodigo() {
    const codigo = this.qiskitCode ? this.qiskitCode.join('\n') : '';
    navigator.clipboard.writeText(codigo).then(() => {
      alert('Code copied to clipboard');
        }).catch(err => {
          console.error('Error copying code: ', err);
      });
  }
  
  toggleHelp() {
    this.showHelp = !this.showHelp;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.isDisabled = false;
    this.isDisabled2 = false;
  }

  clearExpressions() {
    this.userExpressions = [];
  }

  isAddDisabled(): boolean {
    return !this.currentUserExpression || this.currentUserExpression.trim() === '';
  }

  isConfirmDisabled(): boolean {
    return !this.nombreFuncion || this.nombreFuncion.trim().length === 0;
  }

  actionsHidden = true; // Estado para ocultar/mostrar la columna "Actions"

  // Función para alternar la visibilidad de la columna
  toggleActions() {
    this.actionsHidden = !this.actionsHidden;
  }

  tooltipVisible: boolean = false;
  tooltipTableVisible: boolean = false;

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

  mostrarInstrucciones: boolean = false;
  mostrarEjemplos: boolean = false;
  
  recommendation: string = '';  // La recomendación actual
  showRecommendations: boolean = false;  // Controla si mostrar las recomendaciones

  checkForExpressions() {
    if (!this.currentUserExpression.trim()) {
      this.showRecommendations = false;
      return;  // Si el campo está vacío, salir sin hacer más verificaciones
    }
    
    // Revisa todas las expresiones y establece la recomendación adecuada
    this.checkForOrExpression();
    this.checkForAndExpression();
    this.isPrimeNumber();
    this.isEvenNumber();
    this.sumQubits();
    this.xorExpression();
    this.isPowerOfTwo();
  }

  // Maneja el evento 'Tab' y actualiza currentUserExpression
  onTabPress(event: KeyboardEvent) {
    if (event.key === 'Tab' && this.showRecommendations) {
      this.currentUserExpression = this.recommendation;
      this.showRecommendations = false;
    }
  }

  onFocusInput() {
    this.checkForExpressions();  // Verifica las expresiones cuando el input recibe el foco
  }

  selectRecommendation() {
    this.currentUserExpression = this.recommendation;
    this.showRecommendations = false;
  }

  checkForOrExpression() {
    // Verifica si contiene '||' y si la recomendación es diferente
    if (this.currentUserExpression.includes('||') && this.currentUserExpression !== this.recommendation) {
      this.recommendOrExpression();
    }
  }

  // Devuelve 1 si al menos un qubit es 1.
  recommendOrExpression() {
    const qubitIndices = [];
  
    for (let i = 0; i < this.inputQubits; i++) {
      qubitIndices.push(`q${i}`);
    }

    const orExpression = `[${qubitIndices.join(', ')}].map(Number).reduce((a, b) => a | b, 0)`;

    const outputQubit = `q${this.inputQubits + this.outputQubits - 1}`;

    this.recommendation = `${outputQubit} = ${orExpression }`;
    this.showRecommendations = true;
  }

  checkForAndExpression() {
    // Verifica si contiene '&&' y si la recomendación es diferente
    if (this.currentUserExpression.includes('&&') && this.currentUserExpression !== this.recommendation) {
      this.recommendAndExpression();
    }
  }

  // Solo devuelve 1 si todos los qubits son 1, de lo contrario 0.
  recommendAndExpression() {
    const qubitIndices = [];
  
    for (let i = 0; i < this.inputQubits; i++) {
      qubitIndices.push(`q${i}`);
    }

    const andExpression  = `[${qubitIndices.join(', ')}].map(Number).reduce((a, b) => a & b, 1)`;

    const outputQubit = `q${this.inputQubits + this.outputQubits - 1}`;

    this.recommendation = `${outputQubit} = ${andExpression}`;
    this.showRecommendations = true;
  }

  isPrimeNumber() {
    // Verifica si contiene 'isPrime' y si la recomendación es diferente
    if (/is\s*prime/i.test(this.currentUserExpression) && this.currentUserExpression !== this.recommendation) {
      this.recommendIsPrimeExpression();
    }
  }

  recommendIsPrimeExpression() {
    // const qubits = [];

    // for (let i = 0; i < this.outputQubits; i++) {
    //   qubits.push(`q${this.inputQubits + i}`);
    // }

    // this.recommendation = `isPrime(${qubits.join('')})`;
    // this.showRecommendations = true;


    const qubitIndices = [];
  
    // Capturar los qubits de entrada para formar el número en binario
    for (let i = 0; i < this.inputQubits; i++) {
      qubitIndices.push(`q${i}`);
    }

    // Construcción de la expresión para obtener el número en decimal desde binario
    const binaryToDecimal = `parseInt([${qubitIndices.join(', ')}].join(''), 2)`;

    // Lógica en JavaScript para comprobar si el número es primo
    const isPrimeLogic = `(function(n) {
      if (n < 2) return false;
      for (let i = 2; i * i <= n; i++) {
        if (n % i === 0) return false;
      }
      return true;
    })(${binaryToDecimal})`;

    // El resultado se almacena en el primer qubit de salida
    const outputQubit = `q${this.inputQubits + this.outputQubits - 1}`;

    // Generar la recomendación final
    this.recommendation = `${outputQubit} = ${isPrimeLogic}`;
    this.showRecommendations = true;

  }

  isEvenNumber() {
    if (this.currentUserExpression.includes('isEven') && this.currentUserExpression !== this.recommendation) {
      this.recommendIsEvenExpression();
    }
  }

  recommendIsEvenExpression() {

    const qubitIndices = [];
  
    for (let i = 0; i < this.inputQubits; i++) {
      qubitIndices.push(`q${i}`);
    }

    const binaryToDecimal = `parseInt([${qubitIndices.join(', ')}].map(Number).join(''), 2)`;

    const isEvenExpression = `(${binaryToDecimal} % 2 === 0 ? 1 : 0)`;

    const outputQubit = `q${this.inputQubits + this.outputQubits - 1}`;

    this.recommendation = `${outputQubit} = ${isEvenExpression}`;
    this.showRecommendations = true;

  }

  sumQubits() {
    if (this.currentUserExpression.includes('sum') && this.currentUserExpression !== this.recommendation) {
      this.recommendSumQubitsExpression();
    }
  }

  recommendSumQubitsExpression() {

    const qubitIndices = [];
  
    for (let i = 0; i < this.inputQubits; i++) {
      qubitIndices.push(`q${i}`);
    }

    const sumExpression = `[${qubitIndices.join(', ')}].map(Number).reduce((a, b) => a + b, 0)`;

    const outputQubit = `q${this.inputQubits + this.outputQubits - 1}`;

    this.recommendation = `${outputQubit} = ${sumExpression}`;
    this.showRecommendations = true;

  }

  xorExpression() {
    if (this.currentUserExpression.includes('xor') && this.currentUserExpression !== this.recommendation) {
      this.recommendXorExpression();
    }
  }

  // Devuelve 1 si el número de 1s es impar, 0 si es par.
  recommendXorExpression() {

    const qubitIndices = [];
  
    for (let i = 0; i < this.inputQubits; i++) {
      qubitIndices.push(`q${i}`);
    }

    const xorExpression  = `[${qubitIndices.join(', ')}].map(Number).reduce((a, b) => a ^ b, 0)`;

    const outputQubit = `q${this.inputQubits + this.outputQubits - 1}`;

    this.recommendation = `${outputQubit} = ${xorExpression}`;
    this.showRecommendations = true;

  }

  isPowerOfTwo() {
    if (this.currentUserExpression.includes('two') && this.currentUserExpression !== this.recommendation) {
      this.recommendIsPowerOfTwoExpression();
    }
  }

  // Devuelve 1 si el número de 1s es impar, 0 si es par.
  recommendIsPowerOfTwoExpression() {

    const qubitIndices = [];
  
    for (let i = 0; i < this.inputQubits; i++) {
      qubitIndices.push(`q${i}`);
    }

    const binaryToDecimal = `parseInt([${qubitIndices.join(', ')}].join(''), 2)`;

    const isPowerOfTwoExpression = `(function(n) { return (n > 0 && (n & (n - 1)) === 0) ? 1 : 0; })(${binaryToDecimal})`;

    const outputQubit = `q${this.inputQubits + this.outputQubits - 1}`;

    this.recommendation = `${outputQubit} = ${isPowerOfTwoExpression}`;
    this.showRecommendations = true;

  }

}
