import { ASTNode, AssignmentNode, CallNode, GatePlacement, InstantiatedCircuit, RepeatNode, SequenceNode } from './quantum-dsl.model';
import { QuantumDslParser } from './quantum-dsl.parser';

export interface EvaluationOptions {
  expansionMode: 'EXPANDED' | 'MODULAR_BLOCKS';
  defaultQubits?: number;
}

export class QuantumDslEngine {
  private customDefinitions = new Map<string, ASTNode>();

  constructor() {
    this.registerBuiltins();
  }

  private registerBuiltins() {
    // Definiciones compuestas base registradas
    // d(n) = h(n) · x(n) · mcp(n, pi, n-1) · x(n) · h(n)
  }

  /**
   * Ejecuta y compila una expresión de texto del DSL a un InstantiatedCircuit
   */
  public evaluate(dslExpression: string, options: EvaluationOptions = { expansionMode: 'EXPANDED' }): InstantiatedCircuit {
    const parser = new QuantumDslParser(dslExpression.trim());
    const ast = parser.parse();

    let circuitName = 'GroverCircuit';
    let rootNode: ASTNode = ast;

    if (ast.type === 'ASSIGNMENT') {
      const assign = ast as AssignmentNode;
      circuitName = assign.identifier;
      rootNode = assign.expression;
      this.customDefinitions.set(circuitName, rootNode);
    }

    return this.compileAST(rootNode, circuitName, options);
  }

  private compileAST(ast: ASTNode, name: string, options: EvaluationOptions): InstantiatedCircuit {
    let qubits = options.defaultQubits || 4;
    const columnsData: GatePlacement[][] = []; // Lista de columnas, cada una con sus compuertas

    // Recorrido del AST
    this.processNode(ast, columnsData, options, (detectedQubits) => {
      if (detectedQubits > qubits) qubits = detectedQubits;
    });

    // Aplanar las columnas y asignar columnIndex exacto
    const allGates: GatePlacement[] = [];
    columnsData.forEach((colGates, colIdx) => {
      colGates.forEach(gate => {
        gate.columnIndex = colIdx;
        allGates.push(gate);
      });
    });

    const totalColumns = columnsData.length;

    // Generar código Qiskit
    const qiskitCode = this.generateInlineQiskitCode(name, qubits, columnsData);
    const modularQiskitCode = this.generateModularQiskitCode(name, qubits, ast);
    const astSummary = this.generateAstSummary(ast);

    return {
      name,
      qubits,
      columns: totalColumns,
      gates: allGates,
      qiskitCode,
      modularQiskitCode,
      astSummary
    };
  }

  private processNode(
    node: ASTNode,
    columnsData: GatePlacement[][],
    options: EvaluationOptions,
    onQubitsDetected: (q: number) => void
  ) {
    switch (node.type) {
      case 'SEQUENCE': {
        const seq = node as SequenceNode;
        for (const child of seq.children) {
          this.processNode(child, columnsData, options, onQubitsDetected);
        }
        break;
      }
      case 'REPEAT': {
        const repeat = node as RepeatNode;
        for (let i = 0; i < repeat.count; i++) {
          this.processNode(repeat.body, columnsData, options, onQubitsDetected);
        }
        break;
      }
      case 'CALL': {
        const call = node as CallNode;
        this.instantiateCall(call, columnsData, options, onQubitsDetected);
        break;
      }
      default:
        break;
    }
  }

  private instantiateCall(
    call: CallNode,
    columnsData: GatePlacement[][],
    options: EvaluationOptions,
    onQubitsDetected: (q: number) => void
  ) {
    const fn = call.name.toLowerCase();
    const args = call.args;

    // Detectar número de cúbits del primer parámetro si es número
    const n = typeof args[0] === 'number' ? args[0] : (options.defaultQubits || 4);
    onQubitsDetected(n);

    // 1. h(n): Puerta de Hadamard en todos los cúbits
    if (fn === 'h') {
      const col: GatePlacement[] = [];
      for (let q = 0; q < n; q++) {
        col.push({
          name: 'H',
          qubit: q,
          columnIndex: columnsData.length,
          qubitsCount: 1,
          description: `Hadamard gate on q[${q}]`,
          pythonCode: `qc.h(${q})`
        });
      }
      columnsData.push(col);
      return;
    }

    // 2. x(n): Puerta Pauli-X en todos los cúbits
    if (fn === 'x') {
      const col: GatePlacement[] = [];
      for (let q = 0; q < n; q++) {
        col.push({
          name: 'X',
          qubit: q,
          columnIndex: columnsData.length,
          qubitsCount: 1,
          description: `Pauli-X gate on q[${q}]`,
          pythonCode: `qc.x(${q})`
        });
      }
      columnsData.push(col);
      return;
    }

    // 3. binary(n, m): Codificación binaria del valor m
    if (fn === 'binary') {
      const m = typeof args[1] === 'number' ? args[1] : 0;
      // Convertir m a binario con n bits
      // Según página 3: if binary[i] == '1' => qc.x(i)
      const binStr = m.toString(2).padStart(n, '0');
      const col: GatePlacement[] = [];
      for (let i = 0; i < n; i++) {
        // En representación cuántica habitual o Quirk:
        // bit en posición i (0 a n-1)
        if (binStr[i] === '1') {
          col.push({
            name: 'X',
            qubit: i,
            columnIndex: columnsData.length,
            qubitsCount: 1,
            description: `Binary encoding bit ${i} of value ${m}`,
            pythonCode: `qc.x(${i})`
          });
        }
      }
      if (col.length > 0) {
        columnsData.push(col);
      }
      return;
    }

    // 4. mcp(n, alpha, controlled_qubit): Multi-controlled phase gate
    if (fn === 'mcp' || fn === 'mcz') {
      const targetQubit = typeof args[2] === 'number' ? args[2] : (n - 1);
      const alpha = args[1] !== undefined ? args[1] : Math.PI;

      // Columna con compuerta multicontrolada
      const col: GatePlacement[] = [];
      const controls: number[] = [];
      for (let q = 0; q < n; q++) {
        if (q !== targetQubit) controls.push(q);
      }

      // En el grid de QuCo: representamos como MCP en targetQubit, y conectores en controles
      col.push({
        name: 'MCP',
        qubit: targetQubit,
        columnIndex: columnsData.length,
        qubitsCount: n,
        targetQubits: controls,
        description: `Multi-controlled Phase (alpha=${typeof alpha === 'number' ? alpha.toFixed(2) : alpha}) on target q[${targetQubit}]`,
        pythonCode: `qc.mcp(${alpha}, ${JSON.stringify(controls)}, ${targetQubit})`
      });

      columnsData.push(col);
      return;
    }

    // 5. m(n, order): Medición en orden natural '+' o inverso '-'
    if (fn === 'm' || fn === 'measure') {
      const order = args[1] === '-' ? '-' : '+';
      const col: GatePlacement[] = [];
      for (let q = 0; q < n; q++) {
        const cbit = order === '+' ? q : (n - 1 - q);
        col.push({
          name: 'M',
          qubit: q,
          columnIndex: columnsData.length,
          qubitsCount: 1,
          description: `Measure q[${q}] to c[${cbit}]`,
          pythonCode: `qc.measure(${q}, ${cbit})`
        });
      }
      columnsData.push(col);
      return;
    }

    // 6. o(n, m): Oráculo para buscar valor m
    if (fn === 'o' || fn === 'oracle') {
      const m = typeof args[1] === 'number' ? args[1] : 0;
      if (options.expansionMode === 'MODULAR_BLOCKS') {
        // Bloque compacto
        const col: GatePlacement[] = [{
          name: `Oracle_${m}`,
          qubit: 0,
          columnIndex: columnsData.length,
          qubitsCount: n,
          targetQubits: Array.from({ length: n - 1 }, (_, i) => i + 1),
          description: `Oracle for state |${m}> on ${n} qubits`,
          pythonCode: `# Oracle for ${m}\nqc.compose(oracle_${n}_${m}, inplace=True)`
        }];
        columnsData.push(col);
      } else {
        // Expandido: Binary(n, m) · MCP(n, pi, n-1) · Binary(n, m)
        const target = n - 1;
        this.instantiateCall({ type: 'CALL', name: 'binary', args: [n, m] }, columnsData, options, onQubitsDetected);
        this.instantiateCall({ type: 'CALL', name: 'mcp', args: [n, Math.PI, target] }, columnsData, options, onQubitsDetected);
        this.instantiateCall({ type: 'CALL', name: 'binary', args: [n, m] }, columnsData, options, onQubitsDetected);
      }
      return;
    }

    // 7. d(n): Difusor de Grover para n cúbits
    if (fn === 'd' || fn === 'diffuser') {
      if (options.expansionMode === 'MODULAR_BLOCKS') {
        const col: GatePlacement[] = [{
          name: `Diffuser_${n}`,
          qubit: 0,
          columnIndex: columnsData.length,
          qubitsCount: n,
          targetQubits: Array.from({ length: n - 1 }, (_, i) => i + 1),
          description: `Grover Diffuser on ${n} qubits`,
          pythonCode: `# Diffuser for ${n} qubits\nqc.compose(diffuser_${n}, inplace=True)`
        }];
        columnsData.push(col);
      } else {
        // Expandido: h(n) · x(n) · mcp(n, pi, n-1) · x(n) · h(n)
        const target = n - 1;
        this.instantiateCall({ type: 'CALL', name: 'h', args: [n] }, columnsData, options, onQubitsDetected);
        this.instantiateCall({ type: 'CALL', name: 'x', args: [n] }, columnsData, options, onQubitsDetected);
        this.instantiateCall({ type: 'CALL', name: 'mcp', args: [n, Math.PI, target] }, columnsData, options, onQubitsDetected);
        this.instantiateCall({ type: 'CALL', name: 'x', args: [n] }, columnsData, options, onQubitsDetected);
        this.instantiateCall({ type: 'CALL', name: 'h', args: [n] }, columnsData, options, onQubitsDetected);
      }
      return;
    }

    // 8. g(n, [values]): Circuito Grover completo genérico (Sección 6.1)
    if (fn === 'g' || fn === 'grover') {
      let values: number[] = [2, 7];
      if (Array.isArray(args[1])) {
        values = args[1];
      } else if (typeof args[1] === 'number') {
        values = [args[1]];
        if (typeof args[2] === 'number') values.push(args[2]);
      }

      // Calcular iteraciones óptimas de Grover: round(pi / 4 * sqrt(2^n / M))
      const mCount = Math.max(1, values.length);
      const totalStates = Math.pow(2, n);
      const optimalIterations = Math.max(1, Math.round((Math.PI / 4) * Math.sqrt(totalStates / mCount)));

      // h(n)
      this.instantiateCall({ type: 'CALL', name: 'h', args: [n] }, columnsData, options, onQubitsDetected);

      // Bloque repetido {optimalIterations}: [O(n, v1) · O(n, v2) ... · D(n)]
      for (let it = 0; it < optimalIterations; it++) {
        for (const val of values) {
          this.instantiateCall({ type: 'CALL', name: 'o', args: [n, val] }, columnsData, options, onQubitsDetected);
        }
        this.instantiateCall({ type: 'CALL', name: 'd', args: [n] }, columnsData, options, onQubitsDetected);
      }

      // M(n, '+')
      this.instantiateCall({ type: 'CALL', name: 'm', args: [n, '+'] }, columnsData, options, onQubitsDetected);
      return;
    }

    // Si es un subcircuito nombrado genérico (ej: Sub0)
    const col: GatePlacement[] = [{
      name: call.name,
      qubit: 0,
      columnIndex: columnsData.length,
      qubitsCount: n,
      targetQubits: Array.from({ length: n - 1 }, (_, i) => i + 1),
      description: `Subcircuit ${call.name} on ${n} qubits`,
      pythonCode: `# Subcircuit ${call.name}\nqc.compose(${call.name.toLowerCase()}, inplace=True)`
    }];
    columnsData.push(col);
  }

  /**
   * Genera el código Qiskit secuencial directo
   */
  private generateInlineQiskitCode(name: string, qubits: number, columnsData: GatePlacement[][]): string {
    const lines: string[] = [
      `# Circuito cuántico generado por el lenguaje DSL de QuCo`,
      `# Expresión: ${name}`,
      `from qiskit import QuantumCircuit`,
      `import numpy as np`,
      ``,
      `qc = QuantumCircuit(${qubits}, ${qubits})`,
      ``
    ];

    columnsData.forEach((col, colIdx) => {
      lines.push(`# --- Columna ${colIdx} ---`);
      col.forEach(gate => {
        if (gate.name === 'H') {
          lines.push(`qc.h(${gate.qubit})`);
        } else if (gate.name === 'X') {
          lines.push(`qc.x(${gate.qubit})`);
        } else if (gate.name === 'MCP') {
          const controls = gate.targetQubits || [];
          lines.push(`qc.mcp(np.pi, ${JSON.stringify(controls)}, ${gate.qubit})`);
        } else if (gate.name === 'M') {
          lines.push(`qc.measure(${gate.qubit}, ${gate.qubit})`);
        } else if (gate.pythonCode) {
          lines.push(gate.pythonCode);
        }
      });
      lines.push(``);
    });

    lines.push(`print(qc.draw(output='text'))`);
    return lines.join('\n');
  }

  /**
   * Genera el código Qiskit modular mediante funciones componibles
   */
  private generateModularQiskitCode(name: string, qubits: number, ast: ASTNode): string {
    return [
      `# Descripción modular de componentes cuánticos en Python`,
      `from qiskit import QuantumCircuit`,
      `import numpy as np`,
      ``,
      `def h_n(n: int) -> QuantumCircuit:`,
      `    qc = QuantumCircuit(n, n)`,
      `    for i in range(n): qc.h(i)`,
      `    return qc`,
      ``,
      `def x_n(n: int) -> QuantumCircuit:`,
      `    qc = QuantumCircuit(n, n)`,
      `    for i in range(n): qc.x(i)`,
      `    return qc`,
      ``,
      `def binary_n(n: int, m: int) -> QuantumCircuit:`,
      `    qc = QuantumCircuit(n, n)`,
      `    for i in range(n):`,
      `        if ((m >> i) & 1) == 0: qc.x(i)`,
      `    return qc`,
      ``,
      `def mcp_n(n: int, alpha: float, target: int) -> QuantumCircuit:`,
      `    qc = QuantumCircuit(n, n)`,
      `    controls = [i for i in range(n) if i != target]`,
      `    qc.mcp(alpha, controls, target)`,
      `    return qc`,
      ``,
      `def oracle(n: int, m: int) -> QuantumCircuit:`,
      `    qc = QuantumCircuit(n, n)`,
      `    qc = qc.compose(binary_n(n, m))`,
      `    qc = qc.compose(mcp_n(n, np.pi, n - 1))`,
      `    qc = qc.compose(binary_n(n, m))`,
      `    return qc`,
      ``,
      `def diffuser(n: int) -> QuantumCircuit:`,
      `    qc = QuantumCircuit(n, n)`,
      `    qc = qc.compose(h_n(n))`,
      `    qc = qc.compose(x_n(n))`,
      `    qc = qc.compose(mcp_n(n, np.pi, n - 1))`,
      `    qc = qc.compose(x_n(n))`,
      `    qc = qc.compose(h_n(n))`,
      `    return qc`,
      ``,
      `# Construcción del circuito completo '${name}':`,
      `circuit = QuantumCircuit(${qubits}, ${qubits})`,
      `circuit = circuit.compose(h_n(${qubits}))`,
      `for _ in range(3):`,
      `    circuit = circuit.compose(oracle(${qubits}, 2))`,
      `    circuit = circuit.compose(oracle(${qubits}, 7))`,
      `    circuit = circuit.compose(diffuser(${qubits}))`,
      `for i in range(${qubits}): circuit.measure(i, i)`,
      ``,
      `print(circuit.draw(output='text'))`
    ].join('\n');
  }

  private generateAstSummary(ast: ASTNode): string {
    return JSON.stringify(ast, null, 2);
  }

  /**
   * Genera la función Qiskit genérica y parametrizada con (n = 4, ...) para una puerta definida mediante AST
   */
  public generateGenericGatePythonCode(ast: ASTNode, gateName: string): string {
    const rawName = (gateName || 'CustomGate').replace(/[^a-zA-Z0-9_]/g, '_');
    const fnName = rawName.startsWith('get') ? rawName : ('get' + (rawName === '0' ? 'Subcircuito_0' : rawName));

    const pythonLines: string[] = [];
    const detectedParams = new Set<string>();

    const traverse = (node: ASTNode, indent: string = '\t') => {
      switch (node.type) {
        case 'ASSIGNMENT': {
          const assign = node as AssignmentNode;
          traverse(assign.expression, indent);
          break;
        }
        case 'SEQUENCE': {
          const seq = node as SequenceNode;
          for (const child of seq.children) {
            traverse(child, indent);
          }
          break;
        }
        case 'REPEAT': {
          const rep = node as RepeatNode;
          pythonLines.push(`${indent}for _ in range(${rep.count}):`);
          traverse(rep.body, indent + '\t');
          break;
        }
        case 'CALL': {
          const call = node as CallNode;
          const fn = call.name.toLowerCase();
          const args = call.args;

          if (fn === 'h') {
            pythonLines.push(`${indent}for i in range(n): U.h(i)`);
          } else if (fn === 'x') {
            pythonLines.push(`${indent}for i in range(n): U.x(i)`);
          } else if (fn === 'binary') {
            const mArg = args[1] !== undefined ? args[1] : 'm';
            if (typeof mArg === 'string' && isNaN(Number(mArg))) {
              detectedParams.add(mArg);
            }
            pythonLines.push(`${indent}for i in range(n):`);
            pythonLines.push(`${indent}\tif ((int(${mArg}) >> i) & 1) == 0: U.x(i)`);
          } else if (fn === 'mcp' || fn === 'mcz') {
            const alphaArg = args[1] !== undefined ? (args[1] === Math.PI ? 'pi' : args[1]) : 'pi';
            const targetArg = args[2] !== undefined ? args[2] : 'n - 1';
            pythonLines.push(`${indent}target = ${targetArg}`);
            pythonLines.push(`${indent}controls = [i for i in range(n) if i != target]`);
            pythonLines.push(`${indent}U.mcp(${alphaArg}, controls, target)`);
          } else if (fn === 'm' || fn === 'measure') {
            const orderArg = args[1] === '-' ? '-' : '+';
            if (orderArg === '+') {
              pythonLines.push(`${indent}for i in range(n): U.measure(i, i)`);
            } else {
              pythonLines.push(`${indent}for i in range(n): U.measure(i, n - i - 1)`);
            }
          } else if (fn === 'o' || fn === 'oracle') {
            const mVal = args[1] !== undefined ? args[1] : 'm';
            if (typeof mVal === 'string' && isNaN(Number(mVal))) {
              detectedParams.add(mVal);
            }
            pythonLines.push(`${indent}for i in range(n):`);
            pythonLines.push(`${indent}\tif ((int(${mVal}) >> i) & 1) == 0: U.x(i)`);
            pythonLines.push(`${indent}target = n - 1`);
            pythonLines.push(`${indent}controls = [i for i in range(n) if i != target]`);
            pythonLines.push(`${indent}U.mcp(pi, controls, target)`);
            pythonLines.push(`${indent}for i in range(n):`);
            pythonLines.push(`${indent}\tif ((int(${mVal}) >> i) & 1) == 0: U.x(i)`);
          } else if (fn === 'd' || fn === 'diffuser') {
            pythonLines.push(`${indent}for i in range(n): U.h(i)`);
            pythonLines.push(`${indent}for i in range(n): U.x(i)`);
            pythonLines.push(`${indent}target = n - 1`);
            pythonLines.push(`${indent}controls = [i for i in range(n) if i != target]`);
            pythonLines.push(`${indent}U.mcp(pi, controls, target)`);
            pythonLines.push(`${indent}for i in range(n): U.x(i)`);
            pythonLines.push(`${indent}for i in range(n): U.h(i)`);
          } else {
            pythonLines.push(`${indent}# Custom operation: ${call.name}`);
            pythonLines.push(`${indent}sub = get${call.name}(n)`);
            pythonLines.push(`${indent}U.append(sub, list(range(n)))`);
          }
          break;
        }
      }
    };

    traverse(ast, '\t');

    const paramList: string[] = ['n = 4'];
    for (const p of detectedParams) {
      paramList.push(`${p} = 2`);
    }

    const header = `def ${fnName}(${paramList.join(', ')}) : \n\tU = QuantumCircuit(n, name="${rawName}")\n`;
    const body = pythonLines.length > 0 ? pythonLines.join('\n') + '\n' : '\tpass\n';
    const footer = `\treturn U.to_gate()\n`;

    return header + body + footer;
  }

  /**
   * Decompila código Python/Qiskit de una compuerta genérica hacia una expresión DSL equivalente
   */
  public decompileGenericGatePythonCode(pythonCode: string): { expression: string; gateName: string } {
    if (!pythonCode || !pythonCode.trim()) {
      return { expression: '', gateName: '' };
    }

    // 1. Extraer nombre de la compuerta
    let gateName = '';
    const nameMatch = pythonCode.match(/name\s*=\s*["']([^"']+)["']/);
    const defMatch = pythonCode.match(/def\s+([A-Za-z0-9_]+)\s*\(/);

    if (nameMatch && nameMatch[1]) {
      gateName = nameMatch[1];
    } else if (defMatch && defMatch[1]) {
      const rawFn = defMatch[1];
      gateName = rawFn.startsWith('get') && rawFn.length > 3 ? rawFn.substring(3) : rawFn;
    }

    // 2. Extraer líneas del cuerpo de la función
    const rawLines = pythonCode.split('\n');
    const bodyLines: string[] = [];
    let inFunction = false;

    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (!inFunction) {
        if (trimmed.startsWith('def ')) {
          inFunction = true;
        }
        continue;
      }

      if (trimmed.startsWith('return ') || (trimmed.endsWith('.to_gate()') && !trimmed.includes('append'))) {
        break;
      }

      if (trimmed.startsWith('U = QuantumCircuit') || trimmed.startsWith('qc = QuantumCircuit')) {
        continue;
      }

      if (trimmed === 'pass' || !trimmed || trimmed.startsWith('# Custom operation:')) {
        continue;
      }

      bodyLines.push(rawLine);
    }

    // 3. Decompilar líneas del cuerpo
    const operations = this.parsePythonLinesToOperations(bodyLines);
    const opsString = operations.join(' · ');
    const expression = gateName && opsString ? `${gateName} = ${opsString}` : opsString;

    return {
      expression,
      gateName
    };
  }

  private parsePythonLinesToOperations(lines: string[]): string[] {
    const ops: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        i++;
        continue;
      }

      // 1. Bucle for con contador fijo: for _ in range(k):
      const repeatMatch = trimmed.match(/^for\s+[\w_]+\s+in\s+range\((\d+)\)\s*:/);
      if (repeatMatch && !trimmed.includes('U.') && !trimmed.includes('qc.')) {
        const count = repeatMatch[1];
        const currentIndent = line.search(/\S/);
        i++;
        const loopBodyLines: string[] = [];
        while (i < lines.length) {
          const nextLine = lines[i];
          const nextTrimmed = nextLine.trim();
          if (!nextTrimmed) {
            i++;
            continue;
          }
          const nextIndent = nextLine.search(/\S/);
          if (nextIndent <= currentIndent) {
            break;
          }
          loopBodyLines.push(nextLine);
          i++;
        }
        const innerOps = this.parsePythonLinesToOperations(loopBodyLines);
        if (innerOps.length > 0) {
          ops.push(`[${innerOps.join(' · ')}]{${count}}`);
        }
        continue;
      }

      // 2. Binary(n, m)
      if (trimmed.startsWith('b = bin(') || trimmed.startsWith('b=bin(')) {
        const binMatch = trimmed.match(/bin\(([^)]+)\)/);
        const mVal = binMatch ? binMatch[1].trim() : 'm';
        i++;
        while (i < lines.length && (lines[i].includes('for i in range') || lines[i].includes('b[i]') || lines[i].includes('U.x(i)'))) {
          i++;
        }
        ops.push(`Binary(n, ${mVal})`);
        continue;
      }

      // 3. mcp(n, alpha, target) con bloque target / controls
      if (trimmed.startsWith('target =') || trimmed.startsWith('target=')) {
        const targetMatch = trimmed.match(/target\s*=\s*(.+)$/);
        let targetVal = targetMatch ? targetMatch[1].trim() : 'n - 1';
        i++;
        let alphaVal = 'pi';
        while (i < lines.length) {
          const tLine = lines[i].trim();
          if (tLine.includes('.mcp(')) {
            const mcpMatch = tLine.match(/mcp\(([^,]+),/);
            if (mcpMatch) {
              alphaVal = mcpMatch[1].trim();
            }
            i++;
            break;
          }
          i++;
        }
        ops.push(`mcp(n, ${alphaVal}, ${targetVal})`);
        continue;
      }

      // 4. Llamada directa mcp(...)
      if (trimmed.includes('.mcp(')) {
        const mcpDirect = trimmed.match(/mcp\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
        if (mcpDirect) {
          const alpha = mcpDirect[1].trim();
          const tgt = mcpDirect[3].trim();
          ops.push(`mcp(n, ${alpha}, ${tgt})`);
        } else {
          ops.push(`mcp(n, pi, n-1)`);
        }
        i++;
        continue;
      }

      // 5. Capa Hadamard h(n)
      if (trimmed.includes('.h(i)') || trimmed.includes('.h(range(n))') || (trimmed.startsWith('for ') && trimmed.includes('.h('))) {
        ops.push('h(n)');
        i++;
        continue;
      }

      // 6. Capa Pauli-X x(n)
      if (trimmed.includes('.x(i)') || trimmed.includes('.x(range(n))') || (trimmed.startsWith('for ') && trimmed.includes('.x('))) {
        ops.push('x(n)');
        i++;
        continue;
      }

      // 7. Medición M(n, '+') / M(n, '-')
      if (trimmed.includes('.measure(')) {
        if (trimmed.includes('n - i - 1') || trimmed.includes('n-i-1')) {
          ops.push("M(n, '-')");
        } else {
          ops.push("M(n, '+')");
        }
        i++;
        continue;
      }

      // 8. Subcircuito / llamada getX(n)
      if (trimmed.startsWith('sub = get') || trimmed.includes('.append(get')) {
        const subMatch = trimmed.match(/get([A-Za-z0-9_]+)\(/);
        if (subMatch && subMatch[1]) {
          ops.push(`${subMatch[1]}(n)`);
        }
        i++;
        if (i < lines.length && lines[i].trim().includes('.append(')) {
          i++;
        }
        continue;
      }

      if (trimmed.includes('.append(')) {
        const appMatch = trimmed.match(/\.append\(([A-Za-z0-9_]+)/);
        if (appMatch && appMatch[1] && appMatch[1] !== 'sub') {
          ops.push(`${appMatch[1]}(n)`);
        }
        i++;
        continue;
      }

      i++;
    }

    return ops;
  }
}
