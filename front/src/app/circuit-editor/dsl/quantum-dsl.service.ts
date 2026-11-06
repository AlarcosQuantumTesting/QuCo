import { Injectable } from '@angular/core';
import { EdCircuit, EdGate, EdQubit } from '../EdCircuit';
import { QuantumDslEngine } from './quantum-dsl.engine';
import { InstantiatedCircuit } from './quantum-dsl.model';
import { QuantumDslParser } from './quantum-dsl.parser';

export interface DslPreset {
  id: string;
  name: string;
  description: string;
  expression: string;
  defaultMode: 'EXPANDED' | 'MODULAR_BLOCKS';
  qubits: number;
}

export interface DslGateTemplate {
  id: string;
  name: string;
  gateName: string;
  description: string;
  expression: string;
}

@Injectable({
  providedIn: 'root'
})
export class QuantumDslService {
  private engine = new QuantumDslEngine();

  public readonly gateTemplates: DslGateTemplate[] = [
    {
      id: 'diffuser',
      name: 'Diffuser (Grover D(n))',
      gateName: 'Diffuser',
      description: 'Grover Diffuser: D(n) = h(n) · x(n) · mcp(n, pi, n-1) · x(n) · h(n)',
      expression: 'Diffuser = h(n) · x(n) · mcp(n, pi, n-1) · x(n) · h(n)'
    },
    {
      id: 'oracle',
      name: 'Oracle (Grover O(n, m))',
      gateName: 'Oracle',
      description: 'Grover Oracle to mark value m: O(n, m) = Binary(n, m) · mcp(n, pi, n-1) · Binary(n, m)',
      expression: 'Oracle = Binary(n, m) · mcp(n, pi, n-1) · Binary(n, m)'
    },
    {
      id: 'initial_h',
      name: 'Initial Superposition (Hadamard Layer h(n))',
      gateName: 'InitialH',
      description: 'Initial equal superposition layer h(n) across all qubits',
      expression: 'InitialH = h(n)'
    },
    {
      id: 'mcp',
      name: 'Multi-controlled Phase (MCP)',
      gateName: 'MCP',
      description: 'Multi-controlled phase gate mcp(n, pi, n-1)',
      expression: 'MCP = mcp(n, pi, n-1)'
    },
    {
      id: 'measure',
      name: 'Measurement Layer (M(n, order))',
      gateName: 'Measure',
      description: 'Measurement layer in natural order: M(n, \'+\')',
      expression: 'Measure = M(n, \'+\')'
    },
    {
      id: 'grover_block',
      name: 'Grover Block Iteration (Subcircuit)',
      gateName: 'GroverIteration',
      description: 'Grover iterative composite block with repetition: [Binary(n, m) · mcp(n, pi, n-1) · Binary(n, m) · h(n) · x(n) · mcp(n, pi, n-1) · x(n) · h(n)]{1}',
      expression: 'GroverIteration = [Binary(n, m) · mcp(n, pi, n-1) · Binary(n, m) · h(n) · x(n) · mcp(n, pi, n-1) · x(n) · h(n)]{1}'
    },
    {
      id: 'custom',
      name: 'Custom Gate (Free Definition)',
      gateName: 'MyGate',
      description: 'Custom user-defined generic quantum gate',
      expression: 'MyGate = h(n) · x(n) · h(n)'
    }
  ];

  public readonly presets: DslPreset[] = [
    {
      id: 'g_4_2_7_expanded',
      name: 'Grover g_4_2_7 (Expanded)',
      description: '4-qubit Grover circuit searching for 2 and 7, with oracles and diffuser fully expanded into elementary gates.',
      expression: "g_4_2_7 = h(4) · [O(4, 2) · O(4, 7) · D(4)]{3} · M(4, '+')",
      defaultMode: 'EXPANDED',
      qubits: 4
    },
    {
      id: 'g_4_2_7_modular',
      name: 'Grover g_4_2_7 (Modular Subcircuits)',
      description: 'Grover circuit using compact modular blocks (Oracle_2, Oracle_7, Diffuser_4).',
      expression: "g_4_2_7 = h(4) · [O(4, 2) · O(4, 7) · D(4)]{2} · M(4, '+')",
      defaultMode: 'MODULAR_BLOCKS',
      qubits: 4
    },
    {
      id: 'diffuser_4',
      name: 'Grover Diffuser D(4)',
      description: 'Diffuser component for 4 qubits: D(4) = h(4)·x(4)·mcp(4, pi, 3)·x(4)·h(4)',
      expression: 'D_4 = h(4) · x(4) · mcp(4, pi, 3) · x(4) · h(4)',
      defaultMode: 'EXPANDED',
      qubits: 4
    },
    {
      id: 'oracle_4_2',
      name: 'Oracle O(4, 2)',
      description: 'Grover oracle marking value 2 on 4 qubits via Binary and MCP.',
      expression: 'O_4_2 = Binary(4, 2) · MCP(4, pi, 3) · Binary(4, 2)',
      defaultMode: 'EXPANDED',
      qubits: 4
    },
    {
      id: 'oracle_4_7',
      name: 'Oracle O(4, 7)',
      description: 'Grover oracle marking value 7 on 4 qubits via Binary and MCP.',
      expression: 'O_4_7 = Binary(4, 7) · MCP(4, pi, 3) · Binary(4, 7)',
      defaultMode: 'EXPANDED',
      qubits: 4
    },
    {
      id: 'grover_generic',
      name: 'Generic Grover g(4, [2, 7])',
      description: 'Algorithmic Grover generation calculating optimal iterations for target values.',
      expression: 'g(4, [2, 7])',
      defaultMode: 'EXPANDED',
      qubits: 4
    }
  ];

  constructor() {}

  /**
   * Procesa la expresión y devuelve el circuito instanciado
   */
  public compile(expression: string, mode: 'EXPANDED' | 'MODULAR_BLOCKS' = 'EXPANDED', defaultQubits: number = 4): InstantiatedCircuit {
    return this.engine.evaluate(expression, {
      expansionMode: mode,
      defaultQubits
    });
  }

  /**
   * Genera código Python/Qiskit para una puerta genérica a partir de su expresión DSL
   */
  public generateGenericGateCode(expression: string, gateName: string): string {
    const trimmed = (expression || '').trim();
    if (!trimmed) return '';
    const parser = new QuantumDslParser(trimmed);
    const ast = parser.parse();
    return this.engine.generateGenericGatePythonCode(ast, gateName);
  }

  /**
   * Decompila código Python/Qiskit de una compuerta genérica a su expresión DSL equivalente
   */
  public decompilePythonToDsl(pythonCode: string): { expression: string; gateName: string } {
    return this.engine.decompileGenericGatePythonCode(pythonCode);
  }

  /**
   * Inyecta el circuito generado directamente en el EdCircuit de QuCo
   */
  public populateEdCircuit(
    instantiated: InstantiatedCircuit,
    circuit: EdCircuit,
    gateRegistry: any[] = []
  ): void {
    const requiredQubits = instantiated.qubits;
    const requiredCols = Math.max(instantiated.columns + 2, 8);

    circuit.name = instantiated.name;
    circuit.columns = requiredCols;
    circuit.qubits = [];

    // Inicializar matriz de cúbits con identidades
    for (let q = 0; q < requiredQubits; q++) {
      const edQubit = new EdQubit();
      for (let c = 0; c < requiredCols; c++) {
        const idGate = new EdGate('I', 1);
        idGate.columnIndex = c;
        edQubit.gates.push(idGate);
      }
      circuit.qubits.push(edQubit);
    }

    gateRegistry.length = 0; // Limpiar registro anterior

    // Colocar cada puerta calculada por el motor DSL
    for (const gate of instantiated.gates) {
      const col = gate.columnIndex;
      const q = gate.qubit;

      if (q >= requiredQubits || col >= requiredCols) continue;

      if (gate.qubitsCount && gate.qubitsCount > 1 && gate.targetQubits && gate.targetQubits.length > 0) {
        // Compuerta multicúbit / bloque
        const allQubits = [q, ...gate.targetQubits].sort((a, b) => a - b);
        const mainQubit = allQubits[0];

        const edGate = new EdGate(gate.name, allQubits.length);
        edGate.columnIndex = col;
        edGate.description = gate.description || '';
        edGate.code = gate.pythonCode || '';
        edGate.targetQubits = allQubits.slice(1);
        edGate.parentQubit = undefined;

        const gateId = `DSL-${Date.now()}-${col}-${mainQubit}`;
        (edGate as any).gateId = gateId;

        circuit.qubits[mainQubit].gates[col] = edGate;

        // Rellenar cúbits secundarios con '0' y parentQubit
        for (let i = 1; i < allQubits.length; i++) {
          const subQ = allQubits[i];
          const filler = new EdGate('0', 1);
          filler.columnIndex = col;
          filler.parentQubit = mainQubit;
          (filler as any).gateId = gateId;
          circuit.qubits[subQ].gates[col] = filler;
        }

        gateRegistry.push({
          id: gateId,
          name: gate.name,
          column: col,
          qubits: allQubits,
          parentQubit: mainQubit,
          transactionId: gateId
        });
      } else {
        // Compuerta de un solo cúbit (H, X, M, etc.)
        const edGate = new EdGate(gate.name, 1);
        edGate.columnIndex = col;
        edGate.description = gate.description || '';
        edGate.code = gate.pythonCode || '';
        edGate.targetQubits = undefined;
        edGate.parentQubit = undefined;

        circuit.qubits[q].gates[col] = edGate;
      }
    }
  }
}
