/**
 * Modelo de componentes cuánticos y AST para el lenguaje Quantum DSL.
 * Especificación de componentes y puertas genéricas cuánticas.
 */

export type ASTNodeType = 'SEQUENCE' | 'REPEAT' | 'CALL' | 'ASSIGNMENT';

export interface ASTNode {
  type: ASTNodeType;
}

export interface SequenceNode extends ASTNode {
  type: 'SEQUENCE';
  children: ASTNode[];
}

export interface RepeatNode extends ASTNode {
  type: 'REPEAT';
  body: ASTNode;
  count: number;
}

export interface CallNode extends ASTNode {
  type: 'CALL';
  name: string;
  args: any[];
}

export interface AssignmentNode extends ASTNode {
  type: 'ASSIGNMENT';
  identifier: string;
  expression: ASTNode;
}

/**
 * Representación de una puerta atómica en una columna concreta
 */
export interface GatePlacement {
  name: string;
  qubit: number;
  columnIndex: number;
  qubitsCount?: number;
  targetQubits?: number[];
  parentQubit?: number;
  description?: string;
  pythonCode?: string;
}

/**
 * Resultado de instanciar un componente o circuito completo
 */
export interface InstantiatedCircuit {
  name: string;
  qubits: number;
  columns: number;
  gates: GatePlacement[];
  qiskitCode: string;
  modularQiskitCode?: string;
  astSummary: string;
}

/**
 * Interfaz para la descripción de un componente cuántico
 */
export interface ComponentDescription {
  type: 'PRIMITIVE_CODE' | 'COMPOSITE_DSL';
  source: string;
  instantiate(n: number, ...args: any[]): InstantiatedCircuit;
}
