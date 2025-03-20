export class QubitsConfiguration {
  name: string = "";
  qubits: number = 6;
  matrix: number[] = [];

  constructor() {
    this.initializeMatrix();
  }

  randomize() {
    for (let i=0; i<this.qubits/2; i++) {
      let row = Math.floor(Math.random() * this.qubits)
      let aux = this.matrix[i]
      this.matrix[i] = this.matrix[row]
      this.matrix[row] = aux
    }
  }

  // Inicializa la matriz con la diagonal principal en X
  initializeMatrix() {
    for (let i=0; i<this.qubits; i++) 
      this.matrix[i] = i
  }

  // Mueve la "X" dentro de la fila seleccionada
  moveX(row: number, col: number) {
    this.matrix[row] = col
  }

  // Verifica si hay otra "X" en la misma columna
  hasConflict(row: number, col: number): boolean {
    for (let i=0; i<this.qubits; i++)    
      if (i !== row && this.matrix[i] === col)
        return true
    return false
  }

  // Actualiza el tamaño de la matriz cuando cambia el número de cúbits
  updateQubits() {
    const newQubits = Math.max(2, Math.min(200, this.qubits)); // Asegurar valores entre 2 y 200
    if (newQubits !== this.qubits) {
      this.qubits = newQubits;
    }
    this.initializeMatrix(); // Asegurar que la matriz se reconfigura correctamente
  }
}
