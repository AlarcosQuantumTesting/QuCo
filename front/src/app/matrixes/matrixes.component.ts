import { Component, HostListener, ViewChild, AfterViewInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { QuirkService } from '../quirk.service';
import { QiskitService } from '../qiskit.service';
import { FillingService } from '../filling.service';
import { ManagerService } from '../manager.service';
import { CodeTemplate } from '../templates/CodeTemplate';
import { ExpressionsService } from '../expressions.service';
import { Expression } from './Expression';
import { EditorComponent } from '../editor/editor.component';
import { Backend } from '../deterministic/Backend';
import { TranspileService } from '../transpile.service';
import { ProjectService } from '../project.service';
import { QiskitCode } from '../grover/QiskitCode';

@Component({
  selector: 'app-matrixes',
  templateUrl: './matrixes.component.html',
  styleUrls: ['./matrixes.component.css']
})

export class MatrixesComponent implements AfterViewInit {

  @ViewChild(EditorComponent) editor!: EditorComponent;

  someMethodInMatrixes() {
    console.log('Método en matrixes llamado');
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.editor) {
        this.editor.parent = this;
      }
    }, 0);

    if (this.editor) {
      this.editor.parent = this; // Pasar la referencia de matrixes
    }
  }

  ngAfterViewChecked() {
    if (this.editor && !this.editor.parent) {
      this.editor.parent = this;
      console.log("Parent asignado en AfterViewChecked:", this.editor.parent);
    }
  }

  inputQubits: number = 3
  outputQubits: number = 3

  mensajeTemporal: string = '';
  mensajeTemporal2: string = '';
  showHelp = false;
  isDisabled = false;
  isDisabled2 = false;
  isLoadingQiskitCode = false;
  hasHadamardGates = false;

  cols: number = 0
  rows: number = 0
  matrix?: any[]
  decimals?: any[]

  finalMatrix?: any[]
  finalMatrixNumberOfRows: number = 0

  startMatrix?: any[]

  reduceQuirk: boolean = true
  reduceQuiskit: boolean = true

  quirkURL?: SafeResourceUrl
  finalQiskitGate?: string
  qiskitMatrixStart: string = ""
  qiskitMatrix?: any
  qiskitMatrixEnd: string = ""
  calculusTime?: number
  values?: number[]
  error?: any

  domain: string = "amplitude"

  max: number = 50000
  dataReceived: boolean = false
  numberOfReceivedMatrixes: number = 0
  qiskitCode?: string

  hideExamples: boolean = true
  javaExamples: any[] = [
    {
      exprs: ["q5 = (input!=0 && q2==1) ? 1 : 0"],
      explanation: "if the current row (the input) is not ZERO and q2==1, then make q5=1 (i.e., mark the input number as an even number)"
    },
    {
      exprs: ["q5 = (input%2==0) ? 1 : 0"],
      explanation: "if the current row is pair or zero, then make q5=1"
    },
    {
      exprs: ["q5 = (q0==1 && q2==1) ? 1 : 0"],
      explanation: "if the first (q0) and the third (q2) qubits are 1, then make q5=1 (i.e., mark the input number as an even number)"
    },
    {
      exprs: ["q3 = (q0==1) ? 0 : 1", "q4 = (q1==1) ? 0 : 1", "q5 = (q2==1) ? 0 : 1"],
      explanation: "Negate all the input qubits"
    },
    {
      exprs: ["output = 3 * input"],
      explanation: "The output qubits are three times the input qubits"
    },
    {
      exprs: ["output = 3 * q0 + 2 * q1 + q2"],
      explanation: "The output qubits are 3 * q0 + 2 * q1 + q2"
    },
    {
      exprs: ["output = (q0==1 ? input : 0)"],
      explanation: "If the first qubit is 1, then set the output qubits to the input ones; otherwise, set them to zero"
    },
    {
      exprs: ["output = dv(0..1) + dv(2..3)"],
      explanation: "The output is the decimal value of q0 and q1 times the decimal value of q2 and q3"
    },
    {
      exprs: ["output=input <= 1 ? false : !Array.from(new Array(input), (el, i) => i + 1).filter(x => x > 1 && x < input).find(x => input % x === 0)"],
      explanation: "Decides in the last qubit whether the input qubits represent a prime number"
    }
  ]
  hideInstructions: boolean = true

  currentUserExpression: string = ""
  userExpressions: string[] = []

  dialogo: any = undefined
  // expressions: Expression[];
  expressionToSave: Expression = { expressionName: '', jsExpression: '', description: '', type: 'matrixes' };

  modalTranspile: boolean = false;
  circuitName: string = '';
  transpiledCode: string = '';
  availableBackends: Backend[] = [];
  selectedBackends: Backend[] = [];

  modalError: boolean = false;
  mostrarInstEjecucion = false;
  mostrarEjecucionRemote = false;
  mostrarModalGuardarProyecto: boolean = false;
  saveError: string = '';

  projects: StoredProject[] = [];
  selectedProjectId: string = '';
  selectedProjectName: string = '';

  projectList: ProjectListItem[] = [];

  userEmail: string = localStorage.getItem('userEmail') || '';
  userToken: string = localStorage.getItem('userToken') || '';

  REQUIRED_GENERATOR_TYPE: string = 'MATRIX';

  mostrarNotasModal: boolean = false;

  nombreComponente: string = 'Matrices';
  tipoLocal: string = 'quco_matrices';

  isCircuitModified: boolean = false;
  private lastSavedCircuitState: string = '';

  showDeleteProjectModal: boolean = false;
  showApplyChangesModal: boolean = false;
  applyChanges: boolean = false;

  constructor(private quirkService: QuirkService, private qiskitService: QiskitService, private fillingService: FillingService,
    public sanitizer: DomSanitizer, public manager: ManagerService, public service: ExpressionsService, public transpileService: TranspileService,
    private projectService: ProjectService) { }

  addUserExpression(): void {
    console.log('Añadir expresión de usuario');
    this.error = undefined
    if (this.currentUserExpression.trim().length == 0) {
      this.error = "Write some expression"
      return
    }

    this.userExpressions.push(this.currentUserExpression)

    this.currentUserExpression = "";

    this.saveState();
  }

  openTextArea(c: MatrixesComponent, e: Event, title: string, elementIndex?: number) {
    let caja = e.target as any
    this.createDialog(c, caja, title, elementIndex)
    this.dialogo.showModal()
    let textoDialogo = this.dialogo.getElementsByTagName("textarea")[0];
    textoDialogo.value = caja!.value;
    this.dialogo.getElementsByTagName("textarea")[0].focus();
  }

  protected createDialog(cc: MatrixesComponent, caja: any, title: string, parameterIndex?: number) {
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

      let label = document.createElement("strong")
      label.innerHTML = title + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"

      let a = document.createElement("u")
      a.innerHTML = "&times;"
      a.style.fontSize = "24px";
      a.style.position = "absolute";
      a.style.top = "10px";
      a.style.right = "10px";
      a.style.cursor = "pointer";

      let self = this
      a.onclick = function () {
        selfCaja.parentElement.removeChild(self.dialogo)
        self.dialogo = null
        selfCaja.focus()
      }

      this.dialogo.appendChild(label)
      this.dialogo.appendChild(a)

      this.dialogo.appendChild(document.createElement("br"))

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
      textArea.ondblclick = function () {
        textArea.value = "q3 = q0\nq4 = q1\nq5 = (q0&&q1)^q2\n"
      }

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

      addButton.onclick = function () {
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


  removeUserExpression(index: number) {
    this.userExpressions.splice(index, 1);
    this.saveState();
  }

  fillTableWithUserExpressions() {
    this.error = undefined
    if (this.userExpressions.length == 0) {
      this.error = "There are no expressions to fill-in the table"
      this.mensajeTemporal = 'There are no expressions to fill-in the table';
      setTimeout(() => {
        this.mensajeTemporal = '';
      }, 2000);

      return
    }
    this.reset()


    const maxQubit = this.inputQubits + this.outputQubits - 1;


    const qnValue = `q${this.inputQubits + this.outputQubits - 1}`;

    const processedExpressions = this.userExpressions.map(expr =>
      expr.replace(/\bqn\b/g, qnValue)
    );

    const qubitRegex = /\bq(\d+)\b/g;
    let isValid = true;

    for (const expr of processedExpressions) {
      let match;
      while ((match = qubitRegex.exec(expr)) !== null) {
        const qubitNumber = parseInt(match[1], 10);

        if (qubitNumber < 0 || qubitNumber > maxQubit) {
          isValid = false;
          this.mensajeTemporal = `Invalid qubit: q${qubitNumber}. Allowed range: q0 to q${maxQubit}`;
          setTimeout(() => {
            this.mensajeTemporal = '';
          }, 2000);
          break;
        }
      }
    }

    if (isValid) {
      try {

        let matrix = this.fillingService.fillTable(processedExpressions, this.inputQubits, this.outputQubits)
        this.rows = matrix.length
        this.cols = matrix[0].length
        this.load(matrix)


        localStorage.setItem('matrixMatrixes', JSON.stringify(matrix));
        localStorage.setItem('inputQubits', JSON.stringify(this.inputQubits));
        localStorage.setItem('outputQubits', JSON.stringify(this.outputQubits));
        localStorage.setItem('processedExpressions', JSON.stringify(processedExpressions));


        this.goToTable();
      } catch (error) {
        this.error = error

        this.mensajeTemporal = 'The expression is not valid';
        setTimeout(() => {
          this.mensajeTemporal = '';
        }, 2000);
      }
    }

    this.saveState();
  }

  tryFill(index: number) {
    this.reset()
    let exprs = this.javaExamples[index].exprs
    let matrix = this.fillingService.fillTable(exprs, this.inputQubits, this.outputQubits)
    this.rows = matrix.length
    this.cols = matrix[0].length
    this.load(matrix)

    localStorage.setItem('matrixMatrixes', JSON.stringify(this.matrix));
    localStorage.setItem('cols', JSON.stringify(this.cols));
    localStorage.setItem('rows', JSON.stringify(this.rows));

    this.javaExamples[index].attempted = true;

    this.saveState();
  }

  private reset() {
    this.error = undefined
    this.finalMatrix = []
    this.dataReceived = false
    this.numberOfReceivedMatrixes = 0
    this.qiskitCode = ""
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

  drawQuirk(index: number, matrix: any[]) {
    this.reset()
    let info = {
      matrix: matrix[index],
      inputQubits: this.inputQubits,
      qubits: this.inputQubits + this.outputQubits,
      domain: this.domain
    }
    this.quirkService.getQuirk(info).subscribe(
      result => {
        if (this.hasHadamardGates) {
          result = this.applyHadamardToQuirk(result);
        }
        // let url = this.sanitizer.bypassSecurityTrustResourceUrl("https://algassert.com/quirk#circuit=" + JSON.stringify(result))
        let url = this.sanitizer.bypassSecurityTrustResourceUrl("https://alarcosj.esi.uclm.es/quirk#circuit=" + JSON.stringify(result))

        this.quirkURL = url
        // window.open("https://algassert.com/quirk#circuit=" + JSON.stringify(result), "_new")
        window.open("https://alarcosj.esi.uclm.es/quirk#circuit=" + JSON.stringify(result), "_new")
      }
    )
  }

  private applyHadamardToQuirk(quirkJson: any): any {
    if (!quirkJson || !quirkJson.cols) return quirkJson;
    const hadamardCol = new Array(this.inputQubits).fill('H');
    quirkJson.cols.unshift(hadamardCol);
    return quirkJson;
  }

  drawAllQuirk(matrix: any[]) {
    this.reset()
    let info = {
      matrix: matrix,
      inputQubits: this.inputQubits,
      qubits: this.inputQubits + this.outputQubits,
      reduce: this.reduceQuirk,
      domain: this.domain
    }

    this.quirkService.getAllQuirk(info).subscribe(
      result => {
        if (this.hasHadamardGates) {
          result = this.applyHadamardToQuirk(result);
        }
        // let url = this.sanitizer.bypassSecurityTrustResourceUrl("https://algassert.com/quirk#circuit=" + JSON.stringify(result))
        let url = this.sanitizer.bypassSecurityTrustResourceUrl("https://alarcosj.esi.uclm.es/quirk#circuit=" + JSON.stringify(result))

        this.quirkURL = url
        // window.open("https://algassert.com/quirk#circuit=" + JSON.stringify(result), "_new")
        window.open("https://alarcosj.esi.uclm.es/quirk#circuit=" + JSON.stringify(result), "_new")
      }
    )
  }

  drawAllQuirk2(matrix: any[]) {
    this.reset()
    let info = {
      matrix: matrix,
      inputQubits: this.inputQubits,
      qubits: this.inputQubits + this.outputQubits,
      reduce: this.reduceQuirk,
      domain: this.domain
    }

    this.quirkService.getAllQuirk(info).subscribe(
      result => {
        if (this.hasHadamardGates) {
          result = this.applyHadamardToQuirk(result);
        }
        // let url = this.sanitizer.bypassSecurityTrustResourceUrl("https://algassert.com/quirk#circuit=" + JSON.stringify(result))
        let url = this.sanitizer.bypassSecurityTrustResourceUrl("https://alarcosj.esi.uclm.es/quirk#circuit=" + JSON.stringify(result))
        this.quirkURL = url
        //window.open("https://algassert.com/quirk#circuit=" + JSON.stringify(result), "_new")
        window.open("https://alarcosj.esi.uclm.es/quirk#circuit=" + JSON.stringify(result), "_new")
      }
    )
  }

  getUnitaryMatrix(matrix: any[], rowIndex?: number) {
    this.reset()
    let info = {
      matrix: matrix,
      inputQubits: this.inputQubits,
      qubits: this.inputQubits + this.outputQubits
    }
    if (rowIndex != undefined) {
      info.matrix = matrix[rowIndex]
    }
    this.qiskitService.getQiskitMatrix(info).subscribe(
      result => {
        this.loadMatrixes(result)
      }
    )
  }


  mostrarModalNombreFuncion = false;
  nombreFuncion = '';
  matrixTmp: any[] = [];
  asFunctionTmp = false;
  rowIndexTmp?: number;

  getQiskitCode(matrix: any[], asFunction: boolean, rowIndex?: number) {
    let functionName
    if (asFunction) {
      this.matrixTmp = matrix;
      this.asFunctionTmp = asFunction;
      this.rowIndexTmp = rowIndex;
      this.nombreFuncion = '';
      this.error = '';
      this.mostrarModalNombreFuncion = true;
      return;
    }
    this.reset()
    this.isLoadingQiskitCode = true;

    let info = {
      matrix: matrix,
      inputQubits: this.inputQubits,
      qubits: this.inputQubits + this.outputQubits,
      reduce: this.reduceQuiskit,
      domain: this.domain,
      template: this.manager.selectedTemplate,
      functionName: functionName
    }
    if (rowIndex != undefined)
      info.matrix = [matrix[rowIndex]];
    //info.matrix = matrix[rowIndex]
    this.qiskitService.getCode(info).subscribe({
      next: result => {
        this.isLoadingQiskitCode = true;
        this.qiskitCode = result.code
        if (this.qiskitCode) {
          this.qiskitCode = this.qiskitCode.replace("#SHOTS#", "1000")
          this.qiskitCode = this.qiskitCode.replace("#ALGORITHM#", "Matrixes")

          this.qiskitCode = this.qiskitCode.replace("[#CIRCUITS_DECLARATION#]", "[#CIRCUITS_DECLARATION#]\nSPLIT = False\nPARALLEL = True\nORIGINAL_QUBITS=" + (this.inputQubits + this.outputQubits) + "\n")
          this.qiskitCode = this.qiskitCode.replace("#CIRCUITS_DECLARATION#", "QuantumCircuit(" + (this.inputQubits + this.outputQubits) + ", " + this.outputQubits + ")")

        }

        if (asFunction) {
          this.mostrarModal = true;
        }

        this.copiarCodigo();
      },
      error: err => {
        console.error('Error generando código Qiskit', err);

        this.error = err.error?.message || err.message;

        this.isLoadingQiskitCode = false;
        this.mostrarModal = false;

        this.modalError = true;
      },
      complete: () => {
        this.isLoadingQiskitCode = false;
      }
    });
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
    this.isLoadingQiskitCode = true;

    let info = {
      matrix: matrix,
      inputQubits: this.inputQubits,
      qubits: this.inputQubits + this.outputQubits,
      reduce: this.reduceQuiskit,
      domain: this.domain,
      template: this.manager.selectedTemplate,
      functionName: functionName
    };

    if (rowIndex !== undefined) {
      info.matrix = []
      info.matrix.push(matrix[rowIndex])
    }
    this.mostrarModal = true;
    this.qiskitService.getCode(info).subscribe({
      next: result => {
        this.qiskitCode = result.code;
        if (this.qiskitCode) {
          this.qiskitCode = this.qiskitCode.replace("#SHOTS#", "1000")
          this.qiskitCode = this.qiskitCode.replace("#ALGORITHM#", "Matrixes")
          this.qiskitCode = this.qiskitCode.replace("#CIRCUITS_DECLARATION#", "QuantumCircuit(" + (this.inputQubits + this.outputQubits) + ", " + this.outputQubits + ")")
        }
        this.hasHadamardGates = false;
        this.isLoadingQiskitCode = false;
        this.mostrarModal = true;
        this.copiarCodigo();
      },
      error: err => {
        console.error('Error generando código Qiskit', err);
        this.isLoadingQiskitCode = false;
      },
      complete: () => {
        this.isLoadingQiskitCode = false; // ← finaliza carga
      }
    });
  }

  //mio

  toggleHadamardGates() {
    if (this.hasHadamardGates) {
      this.removeHadamardGates();
    } else {
      this.addHadamardGates();
    }
    this.hasHadamardGates = !this.hasHadamardGates;
    this.saveState();
  }

  addHadamardGates() {
    if (!this.qiskitCode) return;

    const lines = this.qiskitCode.split('\n');
    let index = lines.findIndex(line => line.includes('#Output qubits'));

    if (index === -1) {
      index = lines.findIndex(line => line.includes('QuantumCircuit('));
      if (index !== -1) index++;
    }

    const hadamardLines = ['#HADAMARD GATES#'];
    for (let i = 0; i < this.inputQubits; i++) {
      hadamardLines.push(`circuit.h(${i})`);
    }
    hadamardLines.push('');

    if (index !== -1) {
      lines.splice(index, 0, ...hadamardLines);
    } else {
      lines.push(...hadamardLines);
    }

    this.qiskitCode = lines.join('\n');
    this.mensajeTemporal = 'Added Hadamard gates!';
    setTimeout(() => {
      this.mensajeTemporal = '';
    }, 2000);
  }

  removeHadamardGates() {
    if (!this.qiskitCode) return;
    const lines = this.qiskitCode.split('\n');
    this.qiskitCode = lines.filter(line => {
      const isHHeader = line.includes('#HADAMARD GATES#');
      const isHGate = line.trim().startsWith('circuit.h(') && line.includes(')');
      return !isHHeader && !isHGate;
    }).join('\n');

    this.mensajeTemporal = 'Removed Hadamard gates!';
    setTimeout(() => {
      this.mensajeTemporal = '';
    }, 2000);
  }

  countLastQubit() {
    if (this.isDisabled2) return; // Si ya está deshabilitado, no hace nada
    this.isDisabled2 = true;

    let code = ["counts_output_qubit" + " = absolute_frequencies.get('1', 1)\n",
      "probability_output_qubit = counts_output_qubit / 1000\n",
    "result" + " = " + (2 ** this.inputQubits) + " * probability_output_qubit\n",
      "print(f\"Probability of getting 1 in the output qubit: {result}\")"
    ]
    for (let i = 0; i < code.length; i++)
      this.qiskitCode += code[i]

    this.mensajeTemporal = 'Counted last qubit!';
    setTimeout(() => {
      this.mensajeTemporal = '';
    }, 2000);
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

  private load(matrix: any) {
    this.error = undefined
    this.matrix = []
    this.decimals = []
    for (let i = 0; i < matrix.length; i++) {
      let rRow = matrix[i]
      let row = []
      for (let j = 0; j < rRow.length; j++)
        row.push(parseInt(rRow[j]))
      this.matrix.push(row)
      this.decimals.push(this.getDecimals(row))
    }
  }

  private getDecimals(row: any[]) {
    let r = 0
    let cont = this.outputQubits - 1
    for (let i = this.inputQubits; i < this.inputQubits + this.outputQubits; i++)
      r = r + row[i] * Math.pow(2, cont--)
    return r
  }

  negate(rowIndex: number, colIndex: number) {
    if (colIndex < this.inputQubits)
      return
    let value = this.matrix![rowIndex][colIndex]
    this.matrix![rowIndex][colIndex] = (value == 0 ? 1 : 0)
    let row = this.matrix![rowIndex]
    let r = 0
    let cont = this.outputQubits - 1
    for (let i = this.inputQubits; i < row.length; i++)
      r = r + row[i] * Math.pow(2, cont--)
    this.decimals![rowIndex] = r

    this.saveState();
  }

  updateOutputQubits(rowIndex: number) {
    this.error = undefined
    let value = this.decimals![rowIndex]
    let s = value.toString(2)
    for (let i = s.length; i < this.outputQubits; i++)
      s = "0" + s
    for (let i = this.inputQubits; i < this.inputQubits + this.outputQubits; i++) {
      this.matrix![rowIndex][i] = parseInt(s[i - this.inputQubits])
    }

    this.saveState();
  }

  isInvalid: boolean = true;
  projectLoaded: boolean = false;

  ngOnInit() {

    this.userEmail = localStorage.getItem('userEmail') || '';
    this.userToken = localStorage.getItem('userToken') || '';

    console.log("User email in matrixes:", this.userEmail);
    console.log("User token in matrixes:", this.userToken);

    let sessionAttempts = 0;
    const initSession = setInterval(() => {
      this.userEmail = localStorage.getItem('userEmail') || '';
      this.userToken = localStorage.getItem('userToken') || '';
      if (this.userEmail && this.userToken) {
        clearInterval(initSession);
        this.loadProjectNames();

        const savedProjectId = localStorage.getItem('selectedProjectId_matrices');
        const savedProjectName = localStorage.getItem('selectedProjectName_matrices');
        if (savedProjectId && savedProjectName) {
          this.selectedProjectId = savedProjectId;
          this.selectedProjectName = savedProjectName;
          //this.onProjectSelected();
        }
      } else if (++sessionAttempts >= 12) {
        clearInterval(initSession);
      }
    }, 250);

    this.validateInputs();

    this.transpileService.getBackends().subscribe(backends => {
      this.availableBackends = backends;
    });


    this.selectedBackends = JSON.parse(localStorage.getItem('selectedBackends') || '[]');
    this.availableBackends = JSON.parse(localStorage.getItem('availableBackends') || '[]');

    // this.service.getExpressions().subscribe((data: Expression[]) => {
    //   this.expressions = data;
    // });

    this.service.getExpressions().subscribe((data: Expression[]) => {
      this.expressions = data.filter(exp => exp.type === 'matrixes');
    });


    this.inputQubits = JSON.parse(localStorage.getItem('inputQubits') || '3');
    this.outputQubits = JSON.parse(localStorage.getItem('outputQubits') || '3');


    const savedInputQubits = localStorage.getItem('inputQubits');
    const savedOutputQubits = localStorage.getItem('outputQubits');
    const savedUserExpressions = localStorage.getItem('processedExpressions');



    if (savedInputQubits && savedOutputQubits) {
      this.buildMatrixActions();
      setTimeout(() => {

        if (savedUserExpressions) {
          // Agregar expresiones guardadas al sistema
          this.userExpressions = JSON.parse(savedUserExpressions);
          this.fillTableWithUserExpressions();
          this.fillingService.fillTable(this.userExpressions, this.inputQubits, this.outputQubits);
        }
      }, 50);

    }

    this.projectLoaded = localStorage.getItem('projectLoadedMatrices') === 'true';

    if (this.projectLoaded == true) {
      this.mensajeTemporal2 = 'Project loaded successfully!';
      setTimeout(() => {
        this.mensajeTemporal2 = '';
        this.projectLoaded = false;
        localStorage.setItem('projectLoadedMatrices', 'false');
      }, 1000);
      this.selectedProjectId = localStorage.getItem('selectedProjectId_matrices') || '';

      //this.lastSavedCircuitState = this.captureCircuitState();
    }

    //this.lastSavedCircuitState = this.captureCircuitState();

    console.log("last saved: ", this.lastSavedCircuitState);
  }

  validateInputs() {
    if (this.inputQubits === null || this.outputQubits === null) {
      this.error = 'Both fields are required';
      this.isInvalid = true;
      return;
    }

    if (this.inputQubits < 2 || this.inputQubits > 12) {
      this.error = 'Input qubits must be between 2 and 12';
      this.isInvalid = true;
      return;
    }

    if (this.outputQubits < 1) {
      this.error = 'Output qubits must be 0 or more';
      this.isInvalid = true;
      return;
    }

    this.error = '';
    this.isInvalid = false;
  }

  onTemplateChange(selected: CodeTemplate) {
    this.manager.selectedTemplate = this.manager.templates.find(t => t.fileName == selected.fileName) || new CodeTemplate("", "", "");
    this.saveState();
  }

  goToTable(): void {
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


  numberOfInputQubits: number | null = null;
  numberOfOutputQubits: number | null = null;

  buildMatrixActions() {
    this.numberOfInputQubits = this.inputQubits;
    this.numberOfOutputQubits = this.outputQubits;

    localStorage.removeItem('processedExpressions');
    localStorage.removeItem('matrixMatrixes');

    localStorage.setItem('inputQubits', JSON.stringify(this.numberOfInputQubits));
    localStorage.setItem('outputQubits', JSON.stringify(this.numberOfOutputQubits));

    this.hasHadamardGates = false;
    this.qiskitCode = "";

    this.getEmptyMatrix();
    // this.goToSpecifications();
    this.goToTable();
    this.clearExpressions();

    this.saveState()
  }


  mostrarModal: boolean = false;
  mostrarModalGuargarCode: boolean = false;
  qiskitCodeObj: QiskitCode = new QiskitCode();

  copiarCodigo() {
    if (!this.qiskitCode)
      return;
    const codigo = this.qiskitCode
    navigator.clipboard.writeText(codigo).then(() => {
      //alert('Code copied to clipboard');
      this.mensajeTemporal2 = 'Code copied';
      setTimeout(() => {
        this.mensajeTemporal2 = '';
      }, 1000);
    }).catch(err => {
      console.error('Error copying code: ', err);
    });
  }

  guardarCodigo() {
    this.mostrarModalGuargarCode = true;
    this.mostrarModal = false;
  }

  saveCode() {
    this.error = undefined
    if (!this.qiskitCode) return;
    this.qiskitCodeObj.qubits = this.inputQubits + this.outputQubits
    this.qiskitCodeObj.lines = this.qiskitCode?.split('\n')
    this.qiskitService.saveCode(this.qiskitCodeObj).subscribe(
      result => {
        // alert("Code saved")
        this.mensajeTemporal = 'Code successfully saved';
        setTimeout(() => {
          this.mensajeTemporal = '';
        }, 2000);
        this.mostrarModalGuargarCode = false;
      },
      error => {
        this.error = error.error ? error.error.message : error
      }
    )
  }

  transpileCodigo() {
    this.modalTranspile = true;
  }

  selectBackend(backend: Backend) {
    this.selectedBackends.push(backend);
    this.availableBackends = this.availableBackends.filter(b => b.name !== backend.name);
    localStorage.setItem('selectedBackends', JSON.stringify(this.selectedBackends));
    localStorage.setItem('availableBackends', JSON.stringify(this.availableBackends));
  }

  deselectBackend(backend: Backend) {
    this.availableBackends.push(backend);
    this.selectedBackends = this.selectedBackends.filter(b => b.name !== backend.name);
    localStorage.setItem('selectedBackends', JSON.stringify(this.selectedBackends));
    localStorage.setItem('availableBackends', JSON.stringify(this.availableBackends));
  }

  transpile() {
    try {
      const backendsToTranspile = this.selectedBackends.map(b => b.name);
      this.transpileService.transpile(this.qiskitCode ?? '', backendsToTranspile, this.circuitName).subscribe(result => {
        this.transpiledCode = result;
      });
      this.mensajeTemporal = 'The code will be transpiled.';
      setTimeout(() => {
        this.mensajeTemporal = '';
      }
        , 2000);
    } catch (error) {
      console.error('Error during transpilation:', error);
      this.mensajeTemporal = 'Error during transpilation. Please try again.';
      setTimeout(() => {
        this.mensajeTemporal = '';
      }, 2000);
    }

  }


  toggleHelp() {
    this.showHelp = !this.showHelp;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.isDisabled = false;
    this.isDisabled2 = false;
    this.fromEdit = false;
    this.isNameDisabled = false;
    this.expressionToSave = { expressionName: '', jsExpression: '', description: '', type: 'matrixes' };
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
    localStorage.removeItem('inputQubits');
    localStorage.removeItem('outputQubits');
    localStorage.removeItem('processedExpressions');
    localStorage.removeItem('matrixMatrixes');

    location.reload();  // Reiniciar
  }

  creatingExpression: boolean = false;
  mostrarModalCrearExp: boolean = false;
  fromEdit: boolean = false;
  isNameDisabled: boolean = false;

  create() {
    this.creatingExpression = true;
    this.mostrarModalCrearExp = true;
    this.mostrarModalVerExp = false;
    // this.manager.selectedTemplate = new CodeTemplate("", "", "")
  }
  isType: boolean = true;
  save() {
    if (this.isValid()) {

      const existingExpressionIndex = this.expressions.findIndex(exp => exp.expressionName === this.expressionToSave.expressionName);

      if (existingExpressionIndex !== -1) {
        // Si la expresión existe, actualizamos los datos
        if (this.fromEdit) {

          const updatedExpression = { ...this.expressions[existingExpressionIndex], ...this.expressionToSave };

          this.service.updateExpression(updatedExpression).subscribe(
            data => {
              // Actualizamos la expresión en el array
              this.expressions[existingExpressionIndex] = data;

              // Ordenamos las expresiones por nombre
              this.expressions.sort((a, b) => a.expressionName.localeCompare(b.expressionName));

              // Limpiamos el formulario y cerramos el modal
              this.expressionToSave = { expressionName: '', jsExpression: '', description: '', type: 'matrixes' };
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
        this.service.createExpression({
          expressionName: this.expressionToSave.expressionName,
          jsExpression: this.expressionToSave.jsExpression,
          description: this.expressionToSave.description,
          type: 'matrixes'
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
            this.expressionToSave = { expressionName: '', jsExpression: '', description: '', type: 'matrixes' };
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


  saveUserExpression(index: number) {
    this.expressionToSave.jsExpression = this.userExpressions[index];
    this.expressionToSave.type = 'matrixes';
    this.mostrarModalCrearExp = true;
  }

  editExpression(expression: any, index: number) {
    this.expressionToSave = { ...expression };
    this.fromEdit = true;
    this.isNameDisabled = true;
    this.mostrarModalCrearExp = true;
    this.mostrarModalVerExp = false;
  }

  /*
    deleteExpression(id: string, index: number) {
      if (confirm("Are you sure you want to delete this expression?")) {
          this.service.deleteExpression(id).subscribe(
              () => {
                  // Asegurar que `this.expressions` esté inicializado
                  if (!this.expressions) {
                      this.expressions = [];
                  }
  
                  // Eliminar la expresión de la lista
                  this.expressions.splice(index, 1);
  
                  // Ordenar las expresiones por nombre después de eliminar
                  this.expressions.sort((a, b) => a.expressionName.localeCompare(b.expressionName));
  
                  // Actualizar la tabla
                  this.searchExpressions();
              },
              error => {
                  console.error("Error deleting expression:", error);
                  alert("Failed to delete the expression. Please try again.");
              }
          );
      }
    }*/

  showDeleteModal: boolean = false;
  expressionToDelete: any = null;
  deleteIndex: number = -1;

  // Llamada inicial desde la tabla o botón
  openDeleteModal(expression: any, index: number) {
    this.expressionToDelete = expression;
    this.deleteIndex = index;
    this.showDeleteModal = true;
  }

  // Confirmar eliminación
  confirmDelete() {
    if (!this.expressionToDelete) return;

    this.service.deleteExpression(this.expressionToDelete).subscribe(
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



  isValid() {
    return this.expressionToSave.expressionName && this.expressionToSave.jsExpression;
  }

  mostrarModalVerExp: boolean = false;
  filteredExpressions: Expression[] = [];
  expressions: Expression[] = [];
  searchQuery: string = "";
  selectedExpressionIndex: number | null = null;
  buscarBtn: boolean = false;

  recommendation: string = '';  // La recomendación actual
  showRecommendations: boolean = false;  // Controla si mostrar las recomendaciones

  showExpressions() {
    this.mostrarModalVerExp = true;
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

    if (this.searchQuery.trim() != "") {
      this.filteredExpressions = this.expressions.filter(exp =>
        exp.type === 'matrixes' &&
        exp.expressionName.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
  }

  toggleEjemplos() {
    this.mostrarEjemplos = !this.mostrarEjemplos;
  }

  mostrarInstrucciones: boolean = false;
  mostrarEjemplos: boolean = false;



  checkForExpressions() {

    console.log("✅ checkForExpressions() llamado desde EditorComponent"); // Verifica si se llama
    if (!this.currentUserExpression || !this.currentUserExpression.trim()) {
      this.showRecommendations = false;
      console.log("🚫 No hay expresión válida. Recomendaciones ocultas.");
      return;
    }

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
      this.searchQuery = this.recommendation;
      this.showRecommendations = false;
    }
  }

  onFocusInput() {
    this.checkForExpressions();  // Verifica las expresiones cuando el input recibe el foco
  }

  selectRecommendation() {
    this.currentUserExpression = this.recommendation;
    this.showRecommendations = false;
    this.searchQuery = this.currentUserExpression;
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

    this.recommendation = `${outputQubit} = ${orExpression}`;
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

    const andExpression = `[${qubitIndices.join(', ')}].map(Number).reduce((a, b) => a & b, 1)`;

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

    const xorExpression = `[${qubitIndices.join(', ')}].map(Number).reduce((a, b) => a ^ b, 0)`;

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

  isGroverOption(): boolean {
    return true;
  }

  openSaveProjectModal(): void {
    this.saveError = '';
    this.mostrarModalGuardarProyecto = true;
  }

  cancelarSaveModal(): void {
    this.mostrarModalGuardarProyecto = false;
    this.saveError = '';
    this.circuitName = '';
  }

  confirmarGuardarProyecto(): void {
    if (!this.circuitName || this.circuitName.trim().length === 0) {
      this.saveError = "The project name is mandatory.";
      return;
    }

    this.mostrarModalGuardarProyecto = false;
    this.saveError = '';

    this.drawAllQuirk2(this.matrix!);
    this.getQiskitCode(this.matrix!, false);
    setTimeout(() => {
      this.guardarProyecto();
    }, 100);

  }

  guardarProyecto(): void {

    //const idCircuit = crypto.randomUUID();

    let idCircuit: string;

    if (this.applyChanges) {
      idCircuit = this.selectedProjectId;
      this.circuitName = this.selectedProjectName;
      this.applyChanges = false;
    } else {
      idCircuit = crypto.randomUUID();
    }

    if (!this.circuitName || this.circuitName.trim().length === 0) {
      console.error("No se puede guardar: el nombre del circuito es obligatorio.");
      this.saveError = "Guardado fallido: el nombre del proyecto es obligatorio.";
      return;
    }

    let interestingRows = 0;
    const positionValue: { [key: number]: number } = {};

    if (this.matrix && this.matrix.length > 0) {
      for (let i = 0; i < this.matrix.length; i++) {
        const row = this.matrix[i];
        const outputQubitsValues = row.slice(this.inputQubits, this.inputQubits + this.outputQubits);

        let outputDecimalValue = 0;
        for (let j = 0; j < outputQubitsValues.length; j++) {
          outputDecimalValue += outputQubitsValues[j] * Math.pow(2, this.outputQubits - 1 - j);
        }

        if (outputDecimalValue !== 0) {
          positionValue[i] = outputDecimalValue;
        }
      }
      interestingRows = Object.keys(positionValue).length;
    } else {
      interestingRows = 0;
      positionValue["0"] = 0;
    }

    const qProgramExpressions: QProgramExpression[] = this.userExpressions.map((expr: string, index: number) => ({
      name: `UserExpr${index + 1}`,
      expr: expr,
      description: `User Expression ${index + 1}`,
      type: 'matrixes'
    }));

    let quirkCircuitData: any = {};
    if (this.quirkURL) {
      const urlString = this.sanitizer.sanitize(4, this.quirkURL) as string;
      const match = urlString.match(/circuit=(.*)/);
      if (match && match[1]) {
        try {
          quirkCircuitData = JSON.parse(decodeURIComponent(match[1]));
        } catch (e) {
          console.error("Error al parsear JSON del quirkURL:", e);
        }
      }
    }

    let quirkCodeFinal: any = {};
    if (quirkCircuitData.cols) {
      quirkCodeFinal.cols = quirkCircuitData.cols.map((col: any[]) => {
        if (col.some(item => item === "…")) {
          return col;
        }

        let lastSignificantIndex = col.length - 1;
        while (lastSignificantIndex >= 0 && col[lastSignificantIndex] === 1) {
          lastSignificantIndex--;
        }

        return col.slice(0, lastSignificantIndex + 1);
      });
    }

    const qProgram: QProgram = {
      id: idCircuit,
      qubits: this.inputQubits + this.outputQubits,
      expressions: qProgramExpressions,
      shots: 0,
      generator: {
        type: "MATRIX",
        interestingRows: interestingRows,
        positionValue: positionValue
      },
      qcodes: [
        {
          platform: "AerSimulator",
          code: this.qiskitCode || "No qiskit code generated."
        }
      ],
      inputQubits: Array.from({ length: this.inputQubits }, (_, i) => i).join(','),
      outputQubits: Array.from({ length: this.outputQubits }, (_, i) => i + this.inputQubits).join(','),
      qCircuit: {
        id: idCircuit,
        qbits: this.inputQubits + this.outputQubits,
        quirkCode: quirkCodeFinal
      }
    };

    let notesPayload: any[] = [];
    const allNotesSaved = localStorage.getItem('project_notes');

    if (allNotesSaved) {
      try {
        const allNotes = JSON.parse(allNotesSaved);

        notesPayload = allNotes
          .filter((n: any) => n.type.toLowerCase() === this.tipoLocal.toLowerCase())
          .map((n: any, index: number) => ({
            //id: `note_${Date.now()}_${index}`,
            id: crypto.randomUUID(),
            title: n.title,
            text: n.text,
            type: n.type,
            timestamp: n.timestamp
          }));

      } catch (e) {
        console.error("Error procesando las notas del localStorage", e);
      }
    }



    const projectDtoForMapping: any = {
      id: idCircuit,
      name: this.circuitName,
      qProgram: qProgram,
      userEmail: this.userEmail,
      projectNotes: notesPayload
    };

    const finalPayload: any = {
      circuit: projectDtoForMapping,
      user: { id: this.userEmail }
    };

    console.log('Objeto JSON a guardar:', JSON.stringify(finalPayload, null, 2));


    this.projectService.saveProject(finalPayload).subscribe({
      next: (response: unknown) => {
        this.selectedProjectId = idCircuit;
        this.lastSavedCircuitState = this.captureCircuitState();
        this.isCircuitModified = false;
        localStorage.setItem('selectedProjectId_matrices', idCircuit);
        localStorage.setItem('selectedProjectName_matrices', this.circuitName);

        this.mensajeTemporal2 = `Project "${this.circuitName}" saved successfully!`;
        setTimeout(() => { this.mensajeTemporal2 = ''; }, 2000);
        this.loadProjectNames();
      },
      error: (error: any) => {
        console.error('Error al guardar el proyecto:', error);
        alert('Error saving project (Code 400). Check the console and the API documentation.');
      }
    });
  }




  getAuthRequestBody(projectId?: string): any {
    const instanceId = window.crypto.randomUUID();

    const body: any = {
      email: this.userEmail,
      token: this.userToken,
      instanceId: instanceId
    };

    if (projectId) {
      body.projectId = projectId;
    }
    return body;
  }

  loadProjectNames(): void {
    if (this.userEmail && this.userToken) {
      const requestBody = this.getAuthRequestBody();

      this.projectService.getProjectsName(requestBody).subscribe({
        next: (data: ProjectListItem[]) => {
          this.projectList = data.filter(project =>
            project.type === this.REQUIRED_GENERATOR_TYPE
          );
          console.log('Nombres de proyectos cargados:', this.projectList);
        },
        error: (err) => {
          console.error('Error al cargar nombres de proyectos:', err);
          this.projectList = [];
        }
      });
    }
  }

  onProjectSelected(): void {
    if (!this.selectedProjectId) {
      return;
    }

    const requestBody = this.getAuthRequestBody(this.selectedProjectId);

    this.projectService.getProject(requestBody).subscribe({
      next: (project: StoredProject) => {
        /*alert(`Proyecto "${project.name}" cargando...`);
        this.loadProjectDataToComponent(project);*/
        this.mensajeTemporal2 = `Loading project "${project.name}"...`;
        setTimeout(() => { this.mensajeTemporal2 = ''; }, 1000);
        setTimeout(() => { this.loadProjectDataToComponent(project); }, 1000);

      },
      error: (err) => {
        console.error('Error al cargar detalles del proyecto:', err);
        alert('❌ Error al cargar los detalles del proyecto.');
      }
    });
  }


  loadProjectDataToComponent(project: StoredProject): void {
    if (!project.qProgram) {
      console.error('El proyecto no contiene datos de qProgram.');
      return;
    }

    this.lastSavedCircuitState = '';
    this.isCircuitModified = false;

    const qp = project.qProgram;

    this.circuitName = project.name;
    this.inputQubits = qp.qubits - qp.outputQubits.length;
    this.outputQubits = qp.outputQubits.length;

    localStorage.setItem('selectedProjectId_matrices', project.id);
    localStorage.setItem('selectedProjectName_matrices', project.name);

    this.userExpressions = qp.expressions.map((exp: any) => exp.expr);
    this.fillTableWithUserExpressions();
    this.saveInLocal();

    this.qiskitCode = qp.QCodes && qp.QCodes.length > 0 ? qp.QCodes[0].code : '';

    const incomingNotes = project.projectNotes || project.projectNotes;

    if (incomingNotes && Array.isArray(incomingNotes)) {

      const newNotes = incomingNotes.map((n: any) => ({
        title: n.title,
        text: n.text,
        type: n.type,
        timestamp: n.timestamp
      }));

      const storedNotesStr = localStorage.getItem('project_notes');
      let existingNotes: any[] = [];

      if (storedNotesStr) {
        try {
          existingNotes = JSON.parse(storedNotesStr);
        } catch (e) {
          console.error("Error parsing existing notes", e);
          existingNotes = [];
        }
      }

      const notesToKeep = existingNotes.filter((n: any) =>
        (n.type || '').toLowerCase() !== this.tipoLocal.toLowerCase()
      );

      const finalNotesList = [...notesToKeep, ...newNotes];

      localStorage.setItem('project_notes', JSON.stringify(finalNotesList));

      console.log(`Notes updated. Total: ${finalNotesList.length}. Loaded ${newNotes.length} for ${this.tipoLocal}.`);

    } else {

      /* const storedNotesStr = localStorage.getItem('project_notes');
      if (storedNotesStr) {
          const existingNotes = JSON.parse(storedNotesStr);
          const notesToKeep = existingNotes.filter((n: any) => 
              (n.type || '').toLowerCase() !== this.tipoLocal.toLowerCase()
          );
          localStorage.setItem('project_notes', JSON.stringify(notesToKeep));
      }
      */
    }

    //alert(`Proyecto "${project.name}" cargado con éxito.`);

    //this.mensajeTemporal2 = `Project "${project.name}" loaded successfully!`;
    /*this.projectLoaded = true;
    localStorage.setItem('projectLoadedMatrices', 'true');
    

    setTimeout(() => {
      location.reload();
    }, 100);*/

    setTimeout(() => {
      this.selectedProjectId = project.id;
      this.lastSavedCircuitState = this.captureCircuitState();
      this.isCircuitModified = false;
      localStorage.setItem('selectedProjectId_matrices', project.id);
      localStorage.setItem('selectedProjectName_matrices', project.name);

      this.mensajeTemporal2 = `Project "${project.name}" loaded successfully!`;
      this.projectLoaded = true;
      localStorage.setItem('projectLoadedMatrices', 'true');
      setTimeout(() => {
        location.reload();
      }, 100);
    }, 200);

  }


  private captureNotesState(): string {
    const allNotesStr = localStorage.getItem('project_notes');
    if (!allNotesStr) return '[]';

    try {
      const allNotes = JSON.parse(allNotesStr);
      const editorNotes = allNotes
        .filter((n: any) => (n.type || '').toLowerCase() === this.tipoLocal.toLowerCase())
        .map((n: any) => ({ title: n.title, text: n.text }));
      editorNotes.sort((a: any, b: any) => (a.title + a.text).localeCompare(b.title + b.text));

      return JSON.stringify(editorNotes);
    } catch (e) {
      console.error("Error capturing notes state:", e);
      return '[]';
    }
  }

  private captureCircuitState(): string {
    const state = {
      inputQubits: this.inputQubits,
      outputQubits: this.outputQubits,
      domain: this.domain,
      reduceQuirk: this.reduceQuirk,
      reduceQuiskit: this.reduceQuiskit,
      template: this.manager.selectedTemplate.fileName,

      matrix: JSON.stringify(this.matrix),
      expressions: this.userExpressions.slice().sort().join('|'),
      qiskitCodeSnippet: this.qiskitCode ? this.qiskitCode.substring(0, 100) : '',
      currentNotes: this.captureNotesState()
    };
    return JSON.stringify(state);
  }

  private checkForChanges() {
    /*if (!this.selectedProjectId || !this.lastSavedCircuitState) {
        this.isCircuitModified = false;
        return;
    }*/
    if (!this.selectedProjectId) {
      this.isCircuitModified = false;
      return;
    }
    const currentState = this.captureCircuitState();
    this.isCircuitModified = currentState !== this.lastSavedCircuitState;
  }

  saveState() {
    this.saveInLocal();
    this.checkForChanges();
  }

  openDeleteProjectModal() {
    if (!this.selectedProjectId) return;
    this.showDeleteProjectModal = true;
  }

  cancelDeleteProject() {
    this.showDeleteProjectModal = false;
  }

  confirmDeleteProject() {
    if (!this.selectedProjectId) return;

    const projectIdToDelete = this.selectedProjectId;
    const requestBody = { projectId: projectIdToDelete };

    this.projectService.deleteProject(requestBody).subscribe({
      next: () => {
        this.mensajeTemporal2 = `Project "${this.circuitName}" deleted successfully!`;
        setTimeout(() => this.mensajeTemporal2 = '', 3000);

        this.showDeleteProjectModal = false;

        this.selectedProjectId = '';
        this.circuitName = '';
        this.lastSavedCircuitState = '';
        this.isCircuitModified = false;
        localStorage.removeItem('selectedProjectId_matrices');
        localStorage.removeItem('selectedProjectName_matrices');

        this.resetValues();
        this.loadProjectNames();
      },
      error: (err: any) => {
        console.error('Error deleting project:', err);
        alert('Error deleting project. Check console.');
        this.showDeleteProjectModal = false;
      }
    });
  }

  openApplyChangesModal() {
    this.showApplyChangesModal = true;
  }

  cancelApplyChanges() {
    this.showApplyChangesModal = false;
  }

  confirmApplyChanges() {
    this.showApplyChangesModal = false;
    this.circuitName = this.circuitName || '';
    this.applyChanges = true;
    this.guardarProyecto();
  }

  openSaveOrSaveAsNewModal(isNew: boolean) {
    this.saveError = '';

    this.applyChanges = !isNew && !!this.selectedProjectId;

    if (isNew || !this.selectedProjectId) {
      this.circuitName = this.circuitName || `New ${this.nombreComponente} Project`;
    }

    this.mostrarModalGuardarProyecto = true;
  }

  checkNotesChangeAndClose(event: any) {
    this.mostrarNotasModal = false;

    if (this.selectedProjectId) {
      this.checkForChanges();

      if (this.isCircuitModified) {
        this.mensajeTemporal = 'Notes changed, save required.';
        setTimeout(() => this.mensajeTemporal = '', 2000);
      }
    }
  }

  saveInLocal(): void {
    localStorage.setItem('matrixMatrixes', JSON.stringify(this.matrix));
    localStorage.setItem('inputQubits', JSON.stringify(this.inputQubits));
    localStorage.setItem('outputQubits', JSON.stringify(this.outputQubits));

    localStorage.setItem('processedExpressions', JSON.stringify(this.userExpressions));

    localStorage.setItem('reduceQuirk', JSON.stringify(this.reduceQuirk));
    localStorage.setItem('reduceQuiskit', JSON.stringify(this.reduceQuiskit));
    localStorage.setItem('domain', this.domain);

    if (this.manager.selectedTemplate) {
      localStorage.setItem('matrixesSelectedTemplateFileName', this.manager.selectedTemplate.fileName);
    }
  }

  onConfigurationChange() {
    this.saveState();
  }
}


interface QProgramExpression {
  name: string;
  expr: string;
  description: string;
  type: string;
}

interface QProgram {
  id: string;
  qubits: number;
  expressions: QProgramExpression[];
  shots: number;
  generator: any;
  qcodes: { platform: string, code: string }[];
  inputQubits: string;
  outputQubits: string;
  qCircuit: any;
}

interface Circuit {
  id: string;
  name: string;
  qProgram: string;
}

interface SaveProjectData {
  circuit: Circuit;
  user: { id: string };
}

interface StoredProject {
  id: string;
  name: string;
  qProgram: any;
  projectNotes: any[];
}

interface ProjectListItem {
  id: string;
  name: string;
  type: string;
}