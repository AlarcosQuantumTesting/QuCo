import { Component, Input } from '@angular/core';


import { Expression } from '../matrixes/Expression';
import { MatrixesComponent } from '../matrixes/matrixes.component';
import { DomSanitizer } from '@angular/platform-browser';
import { ExpressionsService } from '../expressions.service';
import { FillingService } from '../filling.service';
import { ManagerService } from '../manager.service';
import { QiskitService } from '../qiskit.service';
import { QuirkService } from '../quirk.service';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.scss'
})
export class EditorComponent {

  @Input() parent: any; // Puede ser MatrixesComponent o null si está en otro componente

  callParentMethodEx() {
    if (this.parent) {
      this.parent.someMethodInMatrixes();
    }
  }

  callParentMethod(methodName: string, ...args: any[]) {
    if (this.parent && typeof this.parent[methodName] === 'function') {
      this.parent[methodName](...args);
    }
  }

  onUserInput() {
    if (this.parent) {
      this.parent.checkForExpressions();
    } else {
      console.error("parent no está definido en EditorComponent");
    }
  }

  selectRecommendation() {
    // Lógica para manejar la selección de una recomendación
    console.log("Seleccionada la recomendación:", this.parent?.recommendation);
  }

//   mostrarInstrucciones: boolean = false;
//   mostrarEjemplos: boolean = false;
//   hideExamples : boolean = true
//   mostrarModalVerExp: boolean = false;
//   mostrarModalCrearExp: boolean = false;
//   creatingExpression: boolean = false;
//   isNameDisabled: boolean = false;
//   fromEdit: boolean = false;
//   showRecommendations: boolean = false;

//   recommendation: string = '';
//   mensajeTemporal: string = '';
//   searchQuery: string = "";
//   currentUserExpression : string = ""
//   filteredExpressions: Expression[] = [];
//   userExpressions : string[] = []
//   expressions: Expression[] = [];

//   error ? : any

//   dialogo : any = undefined
//   expressionToSave: Expression = { expressionName: '', jsExpression: '', description: '' };

//   cols : number = 0
//     rows : number = 0
//     matrix? : any[]
//     decimals? : any[]
  
//     finalMatrix? : any[]
//     finalMatrixNumberOfRows : number = 0
  
//     startMatrix? : any[]
  
//     reduceQuirk : boolean = true
//     reduceQuiskit : boolean = true
  
//     qiskitMatrixStart : string = ""
//     qiskitMatrixEnd : string = ""
//     calculusTime? : number
//     dataReceived : boolean = false
//     numberOfReceivedMatrixes : number = 0
//     qiskitCode? : string[]

//     @Input() i: number | undefined; 


//   inputQubits = JSON.parse(localStorage.getItem('inputQubits') || '3');
//   outputQubits = JSON.parse(localStorage.getItem('outputQubits') || '3');

//   javaExamples : any[] = [
//     {
//       exprs : [ "q5 = (input!=0 && q2==1) ? 1 : 0" ],
//       explanation : "if the current row (the input) is not ZERO and q2==1, then make q5=1 (i.e., mark the input number as an even number)"
//     },
//     {
//       exprs : [ "q5 = (input%2==0) ? 1 : 0" ],
//       explanation : "if the current row is pair or zero, then make q5=1"
//     },
//     {
//       exprs : [ "q5 = (q0==1 && q2==1) ? 1 : 0" ],
//       explanation : "if the first (q0) and the third (q2) qubits are 1, then make q5=1 (i.e., mark the input number as an even number)"
//     },
//     {
//       exprs : [ "q3 = (q0==1) ? 0 : 1", "q4 = (q1==1) ? 0 : 1", "q5 = (q2==1) ? 0 : 1" ],
//       explanation : "Negate all the input qubits"
//     },
//     {
//       exprs : [ "output = 3 * input"],
//       explanation : "The output qubits are three times the input qubits"
//     },
//     {
//       exprs : [ "output = 3 * q0 + 2 * q1 + q2"],
//       explanation : "The output qubits are 3 * q0 + 2 * q1 + q2"
//     },
//     {
//       exprs : [ "output = (q0==1 ? input : 0)" ],
//       explanation : "If the first qubit is 1, then set the output qubits to the input ones; otherwise, set them to zero"
//     },
//     {
//       exprs : [ "output = dv(0..1) + dv(2..3)"],
//       explanation : "The output is the decimal value of q0 and q1 times the decimal value of q2 and q3"
//     },
//     {
//       exprs : [ "output=input <= 1 ? false : !Array.from(new Array(input), (el, i) => i + 1).filter(x => x > 1 && x < input).find(x => input % x === 0)" ],
//       explanation : "Decides in the last qubit whether the input qubits represent a prime number"
//     }
//   ]
  
//   constructor(private quirkService : QuirkService, private qiskitService : QiskitService, private fillingService : FillingService,
//       public sanitizer : DomSanitizer, public manager : ManagerService, public service : ExpressionsService) {}

//   onAddExampleClick(i: number): void {
//     console.log('Executing method from EditorComponent', i);
//     // Aquí puedes hacer lo que quieras, como la lógica de agregar un ejemplo
//   }

//   showExpressions() {
//     this.mostrarModalVerExp = true;
//   }

//   create() {
//     this.creatingExpression = true;
//     this.mostrarModalCrearExp = true;
//     this.mostrarModalVerExp = false;
//     // this.manager.selectedTemplate = new CodeTemplate("", "", "")
//   }

//   onSearchInput() {
//     this.currentUserExpression = this.searchQuery;  // Mantiene ambas variables sincronizadas
//     this.filteredExpressions = [...this.expressions];
//     if (this.searchQuery.trim() != "") {
//       this.filteredExpressions = this.expressions.filter(exp =>
//         exp.jsExpression.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
//         exp.expressionName.toLowerCase().includes(this.searchQuery.toLowerCase())
//       );

      
//     const foundExpression = this.manager.expressions.find(exp =>
//       exp.expressionName.toLowerCase() === this.searchQuery.toLowerCase()
//     );

//     // if (foundExpression) {
//     //     console.log("Expression found:", foundExpression);
//     // }
    
//     if (foundExpression) {
//         this.recommendation = `${foundExpression.jsExpression}`;
//         this.showRecommendations = true;
//     }

//     }
//   }


//   searchExpressions() {
//     this.filteredExpressions = this.expressions;

//     if (this.searchQuery.trim() != ""){
//       this.filteredExpressions = this.expressions.filter(exp =>
//           exp.expressionName.toLowerCase().includes(this.searchQuery.toLowerCase())
//       );
//     }
//   }

//   addUserExpression(): void {
//     this.error = undefined
//     if (this.currentUserExpression.trim().length==0) {
//       this.error = "Write some expression"
//       return
//     }
    
//     this.userExpressions.push(this.currentUserExpression)

//     // Limpiar el campo de texto
//     this.currentUserExpression = "";
//   }

//   openTextArea(c : EditorComponent, e : Event, title : string, elementIndex? : number) {
//     let caja = e.target as any
//     this.createDialog(c, caja, title, elementIndex)
//     this.dialogo.showModal()
//     let textoDialogo = this.dialogo.getElementsByTagName("textarea")[0];
//     textoDialogo.value = caja!.value;
//     this.dialogo.getElementsByTagName("textarea")[0].focus();
//   }

//   protected createDialog(cc: EditorComponent, caja: any, title: string, parameterIndex? : number) {
//     let selfCaja = caja
//     let textArea: any
//     if (!this.dialogo) {
//         this.dialogo = document.createElement("dialog")
//         this.dialogo.setAttribute("id", "dialogo");

//         // Estilos para el modal
//         this.dialogo.style.backgroundColor = "#eaf7f7";
//         this.dialogo.style.borderRadius = "12px";
//         this.dialogo.style.padding = "20px";
//         this.dialogo.style.maxWidth = "80%";
//         this.dialogo.style.boxShadow = "0px 10px 30px rgba(0, 0, 0, 0.2)";
//         this.dialogo.style.position = "relative";
//         this.dialogo.style.border = "2px solid #007d86";

//         // Crear y configurar el título
//         let label = document.createElement("strong")
//         label.innerHTML = title + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"

//         // Crear y configurar la "X" para cerrar el modal
//         let a = document.createElement("u")
//         a.innerHTML = "&times;"
//         a.style.fontSize = "24px";
//         a.style.position = "absolute";
//         a.style.top = "10px";
//         a.style.right = "10px";
//         a.style.cursor = "pointer";

//         let self = this
//         a.onclick = function() {
//             selfCaja.parentElement.removeChild(self.dialogo)
//             self.dialogo = null
//             selfCaja.focus()
//         }

//         // Agregar el título y la "X" al modal
//         this.dialogo.appendChild(label)
//         this.dialogo.appendChild(a)

//         this.dialogo.appendChild(document.createElement("br"))

//         // Crear y configurar el textarea
//         textArea = document.createElement("textarea");
//         textArea.style.width = "95%";
//         textArea.style.height = "150px";
//         textArea.style.padding = "10px";
//         textArea.style.fontSize = "16px";
//         textArea.style.borderRadius = "8px";
//         textArea.style.border = "2px solid #ccc";
//         textArea.style.backgroundColor = "#f9f9f9";
//         textArea.style.boxShadow = "0px 4px 8px rgba(0, 0, 0, 0.1)";
//         textArea.style.transition = "all 0.3s ease";
//         textArea.style.border = "2px solid #007d86";

//         this.dialogo.appendChild(textArea);
//         textArea.setAttribute("placeholder", "Write expressions in different lines. For example:\n\nq3 = q0\n" +
//             "q4 = q1\nq5 = (q0&&q1)^q2\n")
//         textArea.setAttribute("rows", "15");
//         textArea.setAttribute("cols", "60");
//         textArea.ondblclick = function() {
//             textArea.value = "q3 = q0\nq4 = q1\nq5 = (q0&&q1)^q2\n"
//         }

//         // Crear y configurar el botón "Add"
//         let addButton = document.createElement("button");
//         addButton.innerHTML = "Add";
//         addButton.style.marginTop = "10px";
//         addButton.style.padding = "8px 15px";
//         addButton.style.borderRadius = "5px";
//         addButton.style.border = "1px solid #ccc";
//         addButton.style.backgroundColor = "#008b95";
//         addButton.style.color = "#fff";
//         addButton.style.fontSize = "16px";
//         addButton.style.cursor = "pointer";

//         addButton.addEventListener("mouseenter", () => {
//           addButton.style.backgroundColor = "#006f78";
//           addButton.style.transform = "scale(1.05)";
//           addButton.style.transition = "all 0.3s ease";
//       });

//       addButton.addEventListener("mouseleave", () => {
//           addButton.style.backgroundColor = "#008b95";
//           addButton.style.transform = "scale(1)";
//       });

//         addButton.onclick = function() {
//             if (textArea!.value.trim().length > 0) {
//                 let expressions = textArea!.value.split("\n")
//                 for (let i = 0; i < expressions.length; i++) {
//                     if (expressions[i].trim().length == 0)
//                         continue
//                     self.currentUserExpression = expressions[i]
//                     self.addUserExpression()
//                 }
//             }
//             selfCaja.parentElement.removeChild(self.dialogo)
//             self.dialogo = null
//             selfCaja.focus()
//         }

//         this.dialogo.appendChild(addButton);
//     }

//     caja.parentElement.appendChild(this.dialogo);
// }


//   removeUserExpression(index : number) {
//     this.userExpressions.splice(index, 1)
//   }

//   onTabPress(event: KeyboardEvent) {
//     if (event.key === 'Tab' && this.showRecommendations) {
//       this.currentUserExpression = this.recommendation;
//       this.showRecommendations = false;
//     }
//   }

//   isAddDisabled(): boolean {
//     return !this.currentUserExpression || this.currentUserExpression.trim() === '';
//   }

//   clearExpressions() {
//     this.userExpressions = [];
//   }

//   saveUserExpression(index: number) {
//     this.expressionToSave.jsExpression = this.userExpressions[index];
//     this.mostrarModalCrearExp = true;
//   }

//   editExpression(expression: any, index: number) {
//     this.expressionToSave = { ...expression };
//     this.fromEdit = true;
//     this.isNameDisabled = true;
//     this.mostrarModalCrearExp = true;
//     this.mostrarModalVerExp = false;
//   }

//   fillTableWithUserExpressions() {
//     this.error = undefined
//     if (this.userExpressions.length==0) {
//       this.error = "There are no expressions to fill-in the table"
//       this.mensajeTemporal = 'There are no expressions to fill-in the table';
//       setTimeout(() => {
//         this.mensajeTemporal = '';
//       }, 2000);

//       return
//     }
//     this.reset()


//     const maxQubit = this.inputQubits + this.outputQubits - 1;


//     // Calculamos el valor de qn
//     const qnValue = `q${this.inputQubits + this.outputQubits - 1}`;

//     // Reemplazamos todas las ocurrencias de "qn" en cada expresión
//     const processedExpressions = this.userExpressions.map(expr =>
//         expr.replace(/\bqn\b/g, qnValue)
//     );

//     const qubitRegex = /\bq(\d+)\b/g;
//     let isValid = true;

//     for (const expr of processedExpressions) {
//         let match;
//         while ((match = qubitRegex.exec(expr)) !== null) {
//             const qubitNumber = parseInt(match[1], 10); // Extrae el número de qubit

//             // Comprueba si está fuera del rango permitido
//             if (qubitNumber < 0 || qubitNumber > maxQubit) {
//                 isValid = false;
//                 // alert(`Invalid qubit: q${qubitNumber}. Allowed range: q0 to q${maxQubit}`);
//                 this.mensajeTemporal = `Invalid qubit: q${qubitNumber}. Allowed range: q0 to q${maxQubit}`;
//                 setTimeout(() => {
//                     this.mensajeTemporal = '';
//                 }, 2000);
//                 break;
//             }
//         }
//     }

//     if (isValid) {
//       try {

//         let matrix = this.fillingService.fillTable(processedExpressions, this.inputQubits, this.outputQubits)
//         this.rows = matrix.length
//         this.cols = matrix[0].length
//         this.load(matrix)


//         localStorage.setItem('matrix', JSON.stringify(matrix));
//         localStorage.setItem('inputQubits', JSON.stringify(this.inputQubits));
//         localStorage.setItem('outputQubits', JSON.stringify(this.outputQubits));
//         localStorage.setItem('processedExpressions', JSON.stringify(processedExpressions));


//         this.goToTable();
//       } catch (error) {
//         this.error = error

//         this.mensajeTemporal = 'The expression is not valid';
//         setTimeout(() => {
//             this.mensajeTemporal = '';
//         }, 2000);
//       }
//     }
//   }

//   private reset() {
//     this.error = undefined
//     this.finalMatrix = []
//     this.dataReceived = false
//     this.numberOfReceivedMatrixes = 0
//     this.qiskitCode = []
//     this.calculusTime = 0
//     this.qiskitMatrixStart = ""
//     this.qiskitMatrixEnd = ""
//   }

//   goToTable(): void {
//     // Encontramos el elemento con el id 'myTable' y desplazamos la página hacia él
//     const table = document.getElementById('myTable');
//     if (table) {
//       table.scrollIntoView({ behavior: 'smooth', block: 'start' });
//     }
//   }

//   private load(matrix: any) {
//     this.error = undefined
//     this.matrix = []
//     this.decimals = []
//     for (let i=0; i<matrix.length; i++) {
//       let rRow = matrix[i]
//       let row = []
//       for (let j=0; j<rRow.length; j++)
//         row.push(parseInt(rRow[j]))
//       this.matrix.push(row)
//       this.decimals.push(this.getDecimals(row))
//     }
//   }

//   private getDecimals(row : any[]) {
//     let r = 0
//     let cont = this.outputQubits - 1
//     for (let i=this.inputQubits; i<this.inputQubits+this.outputQubits; i++)
//       r = r + row[i] * Math.pow(2, cont--)
//     return r
//   }















//   checkForExpressions() {
//     if (!this.currentUserExpression.trim()) {
//       this.showRecommendations = false;
//       return;  // Si el campo está vacío, salir sin hacer más verificaciones
//     }

//     // Revisa todas las expresiones y establece la recomendación adecuada
//     this.checkForOrExpression();
//     this.checkForAndExpression();
//     this.isPrimeNumber();
//     this.isEvenNumber();
//     this.sumQubits();
//     this.xorExpression();
//     this.isPowerOfTwo();
//   }

//   onFocusInput() {
//     this.checkForExpressions();  // Verifica las expresiones cuando el input recibe el foco
//   }

//   selectRecommendation() {
//     this.currentUserExpression = this.recommendation;
//     this.showRecommendations = false;
//   }

//   checkForOrExpression() {
//     // Verifica si contiene '||' y si la recomendación es diferente
//     if (this.currentUserExpression.includes('||') && this.currentUserExpression !== this.recommendation) {
//       this.recommendOrExpression();
//     }
//   }

//   // Devuelve 1 si al menos un qubit es 1.
//   recommendOrExpression() {
//     const qubitIndices = [];

//     for (let i = 0; i < this.inputQubits; i++) {
//       qubitIndices.push(`q${i}`);
//     }

//     const orExpression = `[${qubitIndices.join(', ')}].map(Number).reduce((a, b) => a | b, 0)`;

//     const outputQubit = `q${this.inputQubits + this.outputQubits - 1}`;

//     this.recommendation = `${outputQubit} = ${orExpression }`;
//     this.showRecommendations = true;
//   }

//   checkForAndExpression() {
//     // Verifica si contiene '&&' y si la recomendación es diferente
//     if (this.currentUserExpression.includes('&&') && this.currentUserExpression !== this.recommendation) {
//       this.recommendAndExpression();
//     }
//   }

//   // Solo devuelve 1 si todos los qubits son 1, de lo contrario 0.
//   recommendAndExpression() {
//     const qubitIndices = [];

//     for (let i = 0; i < this.inputQubits; i++) {
//       qubitIndices.push(`q${i}`);
//     }

//     const andExpression  = `[${qubitIndices.join(', ')}].map(Number).reduce((a, b) => a & b, 1)`;

//     const outputQubit = `q${this.inputQubits + this.outputQubits - 1}`;

//     this.recommendation = `${outputQubit} = ${andExpression}`;
//     this.showRecommendations = true;
//   }

//   isPrimeNumber() {
//     // Verifica si contiene 'isPrime' y si la recomendación es diferente
//     if (/is\s*prime/i.test(this.currentUserExpression) && this.currentUserExpression !== this.recommendation) {
//       this.recommendIsPrimeExpression();
//     }
//   }

//   recommendIsPrimeExpression() {

//     const qubitIndices = [];

//     // Capturar los qubits de entrada para formar el número en binario
//     for (let i = 0; i < this.inputQubits; i++) {
//       qubitIndices.push(`q${i}`);
//     }

//     // Construcción de la expresión para obtener el número en decimal desde binario
//     const binaryToDecimal = `parseInt([${qubitIndices.join(', ')}].join(''), 2)`;

//     // Lógica en JavaScript para comprobar si el número es primo
//     const isPrimeLogic = `(function(n) {
//       if (n < 2) return false;
//       for (let i = 2; i * i <= n; i++) {
//         if (n % i === 0) return false;
//       }
//       return true;
//     })(${binaryToDecimal})`;

//     // El resultado se almacena en el primer qubit de salida
//     const outputQubit = `q${this.inputQubits + this.outputQubits - 1}`;

//     // Generar la recomendación final
//     this.recommendation = `${outputQubit} = ${isPrimeLogic}`;
//     this.showRecommendations = true;

//   }

//   isEvenNumber() {
//     if (this.currentUserExpression.includes('isEven') && this.currentUserExpression !== this.recommendation) {
//       this.recommendIsEvenExpression();
//     }
//   }

//   recommendIsEvenExpression() {

//     const qubitIndices = [];

//     for (let i = 0; i < this.inputQubits; i++) {
//       qubitIndices.push(`q${i}`);
//     }

//     const binaryToDecimal = `parseInt([${qubitIndices.join(', ')}].map(Number).join(''), 2)`;

//     const isEvenExpression = `(${binaryToDecimal} % 2 === 0 ? 1 : 0)`;

//     const outputQubit = `q${this.inputQubits + this.outputQubits - 1}`;

//     this.recommendation = `${outputQubit} = ${isEvenExpression}`;
//     this.showRecommendations = true;

//   }

//   sumQubits() {
//     if (this.currentUserExpression.includes('sum') && this.currentUserExpression !== this.recommendation) {
//       this.recommendSumQubitsExpression();
//     }
//   }

//   recommendSumQubitsExpression() {

//     const qubitIndices = [];

//     for (let i = 0; i < this.inputQubits; i++) {
//       qubitIndices.push(`q${i}`);
//     }

//     const sumExpression = `[${qubitIndices.join(', ')}].map(Number).reduce((a, b) => a + b, 0)`;

//     const outputQubit = `q${this.inputQubits + this.outputQubits - 1}`;

//     this.recommendation = `${outputQubit} = ${sumExpression}`;
//     this.showRecommendations = true;

//   }

//   xorExpression() {
//     if (this.currentUserExpression.includes('xor') && this.currentUserExpression !== this.recommendation) {
//       this.recommendXorExpression();
//     }
//   }

//   // Devuelve 1 si el número de 1s es impar, 0 si es par.
//   recommendXorExpression() {

//     const qubitIndices = [];

//     for (let i = 0; i < this.inputQubits; i++) {
//       qubitIndices.push(`q${i}`);
//     }

//     const xorExpression  = `[${qubitIndices.join(', ')}].map(Number).reduce((a, b) => a ^ b, 0)`;

//     const outputQubit = `q${this.inputQubits + this.outputQubits - 1}`;

//     this.recommendation = `${outputQubit} = ${xorExpression}`;
//     this.showRecommendations = true;

//   }

//   isPowerOfTwo() {
//     if (this.currentUserExpression.includes('two') && this.currentUserExpression !== this.recommendation) {
//       this.recommendIsPowerOfTwoExpression();
//     }
//   }

//   // Devuelve 1 si el número de 1s es impar, 0 si es par.
//   recommendIsPowerOfTwoExpression() {

//     const qubitIndices = [];

//     for (let i = 0; i < this.inputQubits; i++) {
//       qubitIndices.push(`q${i}`);
//     }

//     const binaryToDecimal = `parseInt([${qubitIndices.join(', ')}].join(''), 2)`;

//     const isPowerOfTwoExpression = `(function(n) { return (n > 0 && (n & (n - 1)) === 0) ? 1 : 0; })(${binaryToDecimal})`;

//     const outputQubit = `q${this.inputQubits + this.outputQubits - 1}`;

//     this.recommendation = `${outputQubit} = ${isPowerOfTwoExpression}`;
//     this.showRecommendations = true;

//   }

}
