import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ManagerService } from '../manager.service';
import { CodeTemplate } from '../templates/CodeTemplate';
import { Backend } from '../deterministic/Backend';
import { TranspileService } from '../transpile.service';

interface Term {
  coef: number;
  var1: string;
}

interface Constraint {
  terms: Term[];
  target: number;
  lambda: number;
  raw: string;
  sense: string;
}

@Component({
  selector: 'app-annealing',
  templateUrl: './annealing.component.html',
  styleUrls: ['./annealing.component.css']
})
export class AnnealingComponent implements OnInit {
  objectiveInput: string = `12x0+14x1+16x2+3x3`;
  problemInput: string = `7x0+20x1+3x2+2x3=1
14x0+1x1+20x2+18x3=1
13x0+4x1+16x2+3x3=1
19x0+13x1+15x2+14x3=1
9x0+7x1+20x2+8x3=1`;

  // Parsed representation
  numQubits: number = 0;
  varList: string[] = [];
  objTerms: Term[] = [];
  constraints: Constraint[] = [];
  quboLinear: number[] = [];
  quboQuadratic: { [key: string]: number } = {};
  quboOffset: number = 0;

  // Ising coefficients
  isingLinear: number[] = [];
  isingQuadratic: { [key: string]: number } = {};
  isingOffset: number = 0;

  // Output
  code: string = '';
  errorMessage: string = '';
  mensajeTemporal: string = '';

  // Graph filtering
  graphVarStart: number | null = null;
  graphVarEnd: number | null = null;

  // Direct coupling lookup
  lookupVar1: string = '';
  lookupVar2: string = '';
  showHelp: boolean = false;
  mostrarEjemplos: boolean = false;
  globalLambda: number = 10;
  edgeMathDerivations: any = {};

  // Formalized problem strings
  formattedObjective: string = '';
  formattedConstraints: string[] = [];

  // Modal triggers
  mostrarInstEjecucion: boolean = false;
  mostrarEjecucionRemote: boolean = false;
  mostrarDownloadModal: boolean = false;
  mostrarCodigoModal: boolean = false;
  mostrarMathModal: boolean = false;
  mostrarTopologyInfoModal: boolean = false;
  mostrarOptimizationInfoModal: boolean = false;
  mostrarHardwareInfoModal: boolean = false;
  mostrarDensityModal: boolean = false;
  selectedEdgeMath: any = null;

  isEditingCode: boolean = false;
  modalTranspile: boolean = false;
  availableBackends: Backend[] = [];
  selectedBackends: Backend[] = [];
  circuitName: string = '';
  transpiledCode: string = '';

  examples = [
    {
      title: 'Default constraint problem (4 Qubits)',
      description: 'A complex mathematical problem with 4 binary variables (x0 to x3) and 5 overlapping equations. The quantum solver tries to balance these heavily competing constraints with a moderate global penalty.',
      objective: `12x0+14x1+16x2+3x3`,
      constraints: `7x0+20x1+3x2+2x3=1
14x0+1x1+20x2+18x3=1
13x0+4x1+16x2+3x3=1
19x0+13x1+15x2+14x3=1
9x0+7x1+20x2+8x3=1`,
      lambda: 9
    },
    {
      title: 'Resource allocation route (3 Qubits)',
      description: 'Imagine a delivery route with three stops. We want to minimize the travel cost, but we are forced by the rules to visit exactly one stop from the first pair, and exactly one from the second. We use a softer global penalty here.',
      objective: `2x0+3x1-4x2`,
      constraints: `1x0+1x1=1
1x1+1x2=1`,
      lambda: 4
    },
    {
      title: 'Inventory selection (5 Qubits)',
      description: 'You must select items from an inventory. The objective function favors selecting cheaper items. However, your warehouse rules dictate that exactly two items must be chosen from the first group, and one from the second. We use a stronger global penalty to ensure rules are obeyed.',
      objective: `1x0+2x1+3x2+4x3+5x4`,
      constraints: `1x0+1x1+1x2=2
1x2+1x3+1x4=1`,
      lambda: 13
    },
    {
      title: 'Staff scheduling (6 Qubits)',
      description: 'Assign shifts to 6 employees to minimize costs while meeting minimum coverage requirements across different time slots.',
      objective: `10x0+12x1+15x2+11x3+14x4+9x5`,
      constraints: `1x0+1x1+1x2=2
1x3+1x4+1x5=1
1x1+1x2+1x4=2`,
      lambda: 15
    },
    {
      title: 'Financial portfolio (7 Qubits)',
      description: 'Select a combination of 7 assets to minimize cost subject to budget constraints and risk diversification rules.',
      objective: `4x0+7x1+2x2+5x3+6x4+3x5+8x6`,
      constraints: `1x0+1x1+1x2+1x3=2
1x4+1x5+1x6=1
1x0+1x3+1x4+1x6=2`,
      lambda: 21
    },
    {
      title: 'Network routing (8 Qubits)',
      description: 'Find optimal paths in an 8-node network routing problem, minimizing latency while ensuring critical nodes are traversed.',
      objective: `5x0+2x1+8x2+4x3+3x4+7x5+6x6+1x7`,
      constraints: `1x0+1x1+1x2+1x3=1
1x4+1x5+1x6+1x7=2
1x0+1x2+1x4+1x6=2
1x1+1x3+1x5+1x7=1`,
      lambda: 18
    },
    {
      title: 'Logistics distribution (9 Qubits)',
      description: 'Distribute goods across 9 different warehouses, optimizing for minimal transport costs while ensuring that specific delivery capacity constraints are met.',
      objective: `3x0+8x1+5x2+9x3+2x4+4x5+7x6+6x7+1x8`,
      constraints: `1x0+1x1+1x2=1
1x3+1x4+1x5=1
1x6+1x7+1x8=1
1x0+1x3+1x6=1
1x1+1x4+1x7=1`,
      lambda: 12
    },
    {
      title: 'Task clustering (10 Qubits)',
      description: 'Group 10 distinct computational tasks into execution clusters. The cost function minimizes overall execution time, while the constraints ensure that conflicting tasks are not clustered together.',
      objective: `4x0+2x1+6x2+3x3+7x4+5x5+9x6+1x7+8x8+10x9`,
      constraints: `1x0+1x1+1x2+1x3=2
1x4+1x5+1x6=1
1x7+1x8+1x9=1
1x0+1x4+1x7=1`,
      lambda: 15
    },
    {
      title: 'Smart grid energy distribution (11 Qubits)',
      description: 'Optimize power distribution across an 11-node smart grid. The objective minimizes power loss, while the constraints simulate base load requirements across different city zones.',
      objective: `5x0+10x1+2x2+8x3+4x4+7x5+3x6+9x7+6x8+1x9+11x10`,
      constraints: `1x0+1x1+1x2=1
1x3+1x4+1x5+1x6=2
1x7+1x8+1x9+1x10=1
1x0+1x3+1x7=1
1x2+1x6+1x10=1`,
      lambda: 18
    },
    {
      title: 'Factory line scheduling (12 Qubits)',
      description: 'Schedule 12 manufacturing jobs across multiple assembly lines. The constraints ensure that sequential jobs respect timing dependencies, while the objective minimizes machine idle time.',
      objective: `8x0+3x1+5x2+12x3+7x4+1x5+9x6+4x7+11x8+2x9+6x10+10x11`,
      constraints: `1x0+1x1+1x2+1x3=1
1x4+1x5+1x6+1x7=1
1x8+1x9+1x10+1x11=1
1x0+1x4+1x8=1
1x1+1x5+1x9=1
1x2+1x6+1x10=1`,
      lambda: 20
    },
    {
      title: 'Large dense problem (13 Qubits)',
      description: 'A highly complex and dense optimization problem involving 13 variables and 13 equations. It tests the limits of the problem topology graph and edge math visualizations.',
      objective: `4x0+20x1+13x2+12x3+2x4+5x5+3x6+10x7+13x8+15x9+7x10+8x11+11x12`,
      constraints: `12x0+6x1+11x2+7x3+11x4+12x5+2x6+1x7+13x8+13x9+7x10+15x11+15x12=1
10x0+11x1+13x2+6x4+1x5+18x6+8x7+16x8+6x9+5x10+5x11+18x12=1
13x0+15x1+19x3+5x4+14x5+10x6+9x7+7x8+3x9+19x10+16x12=1
15x0+13x1+13x2+13x3+15x4+3x5+16x6+2x7+19x8+1x9+18x10+11x11+4x12=1
10x0+15x1+14x2+20x3+20x4+5x5+13x6+10x7+3x8+4x9+5x10+15x11+11x12=1
16x0+2x1+13x2+7x3+20x4+1x5+5x6+20x7+1x8+7x9+5x10+18x11+14x12=1
20x0+17x1+1x2+19x3+12x4+1x5+16x6+6x7+18x8+19x9+13x10+9x11+6x12=1
16x0+16x1+18x2+8x3+6x4+4x5+14x7+16x8+18x9+13x10+15x11=1
11x0+12x1+11x2+6x3+13x4+5x5+12x6+20x7+14x8+6x9+10x10+20x11+5x12=1
15x0+16x1+15x2+10x3+16x4+9x5+4x6+7x7+4x8+5x9+5x10+3x11+16x12=1
11x0+7x1+2x3+4x4+15x5+8x6+6x7+5x8+8x9+20x10+1x11+3x12=1
4x0+16x1+1x2+18x3+6x4+12x5+18x6+10x7+20x8+9x9+14x10+9x11+16x12=1
3x1+2x3+7x4+8x5+7x6+2x7+11x8+7x9+12x10+17x11+5x12=1`,
      lambda: 10
    }
  ];

  constructor(private http: HttpClient, public manager: ManagerService, public transpileService: TranspileService) { }

  ngOnInit(): void {
    const savedObj = localStorage.getItem('annealing_objective');
    const savedProb = localStorage.getItem('annealing_constraints');
    const savedLambda = localStorage.getItem('annealing_lambda');

    if (savedObj !== null) this.objectiveInput = savedObj;
    if (savedProb !== null) this.problemInput = savedProb;
    if (savedLambda !== null) this.globalLambda = Number(savedLambda);

    this.manager.templatesLoaded.subscribe(() => {
      this.selectDefaultTemplate();
    });
    this.generateQiskitCode();

    this.transpileService.getBackends().subscribe(backends => {
      this.availableBackends = backends;
    });

    this.selectedBackends = JSON.parse(localStorage.getItem('selectedBackends') || '[]');
    this.availableBackends = JSON.parse(localStorage.getItem('availableBackends') || '[]');
  }

  toggleHelp(): void {
    this.showHelp = !this.showHelp;
  }

  onTemplateChange(selected: CodeTemplate) {
    this.manager.selectedTemplate = this.manager.templates.find(t => t.fileName == selected.fileName) || new CodeTemplate("", "", "");
    this.generateQiskitCode();
  }

  private selectDefaultTemplate() {
    const templates = this.manager.getTemplatesStartingExactlyBy(['annealing']);
    if (templates && templates.length > 0) {
      this.onTemplateChange(templates[0]);
    }
  }

  loadExample(index: number): void {
    const example = this.examples[index];
    this.objectiveInput = example.objective;
    this.problemInput = example.constraints;
    this.globalLambda = example.lambda;
    this.generateQiskitCode();
    this.mensajeTemporal = "Example loaded successfully!";
    setTimeout(() => this.mensajeTemporal = '', 2000);
  }

  calculateAndOpenMathModal(v1: number, v2: number): void {
    const derivations: any[] = [];
    let totalWeight = 0;

    for (const c of this.constraints) {
      let a = 0;
      let b = 0;
      for (const term of c.terms) {
        const termIdx = this.varList.indexOf(term.var1);
        if (termIdx === v1) a += term.coef;
        if (termIdx === v2) b += term.coef;
      }

      if (a !== 0 && b !== 0) {
        const contribution = 2 * c.lambda * a * b;
        totalWeight += contribution;
        derivations.push({
          rawConstraint: c.raw,
          lambda: c.lambda,
          a: a,
          b: b,
          contribution: contribution
        });
      }
    }

    if (derivations.length === 0) {
      this.errorMessage = `No coupling exists between x${this.varList[v1]} and x${this.varList[v2]}.`;
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    this.selectedEdgeMath = {
      v1: this.varList[v1],
      v2: this.varList[v2],
      weight: totalWeight,
      derivations: derivations
    };

    this.mostrarMathModal = true;
  }

  openEdgeMathModal(edge: any) {
    const parts = edge.key.split(',');
    const v1 = parseInt(parts[0]);
    const v2 = parseInt(parts[1]);
    this.calculateAndOpenMathModal(v1, v2);
  }

  openMathModalByVars() {
    if (!this.lookupVar1 || !this.lookupVar2) return;
    const idx1 = this.varList.indexOf(this.lookupVar1);
    const idx2 = this.varList.indexOf(this.lookupVar2);
    if (idx1 === -1 || idx2 === -1) return;

    const minIdx = Math.min(idx1, idx2);
    const maxIdx = Math.max(idx1, idx2);
    this.calculateAndOpenMathModal(minIdx, maxIdx);
  }

  getNumCouplings(): number {
    return Object.keys(this.quboQuadratic).filter(k => this.quboQuadratic[k] !== 0).length;
  }

  getDensity(): number {
    if (this.numQubits <= 1) return 0;
    const maxEdges = (this.numQubits * (this.numQubits - 1)) / 2;
    return (this.getNumCouplings() / maxEdges) * 100;
  }

  getQuadraticKeys(): string[] {
    return Object.keys(this.quboQuadratic).filter(k => this.quboQuadratic[k] !== 0).sort();
  }

  getGraphNodes() {
    const nodes = [];
    const radius = 110;
    const centerX = 150;
    const centerY = 150;

    const start = this.graphVarStart !== null ? this.graphVarStart : 0;
    const end = this.graphVarEnd !== null ? this.graphVarEnd : 999999;

    const visibleIndices = [];
    for (let i = 0; i < this.numQubits; i++) {
      const varNum = parseInt(this.varList[i]);
      if (varNum >= start && varNum <= end) {
        visibleIndices.push(i);
      }
    }

    for (let i = 0; i < visibleIndices.length; i++) {
      const origIndex = visibleIndices[i];
      const angle = (i / visibleIndices.length) * 2 * Math.PI - Math.PI / 2;
      nodes.push({
        id: origIndex,
        label: this.varList[origIndex],
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      });
    }
    return nodes;
  }

  getGraphEdges() {
    const edges = [];
    const nodes = this.getGraphNodes();
    const nodeMap = new Map();
    nodes.forEach(n => nodeMap.set(n.id, n));

    for (const key of this.getQuadraticKeys()) {
      const parts = key.split(',');
      if (parts.length === 2) {
        const n1 = parseInt(parts[0]);
        const n2 = parseInt(parts[1]);
        const node1 = nodeMap.get(n1);
        const node2 = nodeMap.get(n2);
        if (node1 && node2) {
          edges.push({
            key: key,
            labelKey: `${this.varList[n1]},${this.varList[n2]}`,
            weight: this.quboQuadratic[key],
            x1: node1.x,
            y1: node1.y,
            x2: node2.x,
            y2: node2.y
          });
        }
      }
    }
    return edges;
  }

  getMissingCouplings(): string[] {
    const missing = [];
    const keys = this.getQuadraticKeys();
    for (let i = 0; i < this.numQubits; i++) {
      for (let j = i + 1; j < this.numQubits; j++) {
        if (!keys.includes(`${i},${j}`) && !keys.includes(`${j},${i}`)) {
          missing.push(`Q<sub>${this.varList[i]},${this.varList[j]}</sub>`);
        }
      }
    }
    return missing;
  }

  parseInput(): void {
    this.errorMessage = '';

    if (!this.objectiveInput || this.objectiveInput.trim().length === 0) {
      throw new Error("The objective function is empty. Please enter a cost function to minimize.");
    }

    // Objective function
    this.objTerms = this.parseTerms(this.objectiveInput.trim());

    // Constraints
    this.constraints = [];
    const lines = this.problemInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(',');
      let lambdaVal = this.globalLambda;
      if (parts.length >= 2) {
        lambdaVal = parseFloat(parts[1].trim());
        if (isNaN(lambdaVal)) {
          throw new Error(`Line ${i + 1} invalid: Penalty lambda '${parts[1]}' must be a number.`);
        }
      }

      let sense = '==';
      let exprStr = '';
      let targetVal = 0;

      if (parts[0].includes('<=')) {
        sense = '<=';
        const eqParts = parts[0].split('<=');
        exprStr = eqParts[0].trim();
        targetVal = parseFloat(eqParts[1].trim());
      } else if (parts[0].includes('>=')) {
        sense = '>=';
        const eqParts = parts[0].split('>=');
        exprStr = eqParts[0].trim();
        targetVal = parseFloat(eqParts[1].trim());
      } else if (parts[0].includes('=')) {
        sense = '==';
        const eqParts = parts[0].split('=');
        exprStr = eqParts[0].trim();
        targetVal = parseFloat(eqParts[1].trim());
      } else {
        throw new Error(`Line ${i + 1} invalid: Missing comparison operator ('=', '<=', '>=') in expression.`);
      }

      if (isNaN(targetVal)) {
        throw new Error(`Line ${i + 1} invalid: Target constraint value must be a number.`);
      }

      const terms = this.parseTerms(exprStr);
      this.constraints.push({
        terms,
        target: targetVal,
        lambda: lambdaVal,
        raw: line,
        sense: sense
      });
    }

    // Determine total number of variables/qubits
    const varSet = new Set<string>();
    for (const term of this.objTerms) {
      varSet.add(term.var1);
    }
    for (const c of this.constraints) {
      for (const term of c.terms) {
        varSet.add(term.var1);
      }
    }

    if (varSet.size === 0) {
      throw new Error("No variables found. Variables must be of format 'xN' (e.g., 'x0', 'x1').");
    }

    this.varList = Array.from(varSet).sort((a, b) => {
      // Try parsing as numbers to sort correctly (e.g., x2 before x10)
      const numA = parseFloat(a.replace(/_/g, '.'));
      const numB = parseFloat(b.replace(/_/g, '.'));
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });
    this.numQubits = this.varList.length;
  }

  private parseTerms(expr: string): Term[] {
    const termRegex = /([+-]?)\s*(\d*\.?\d*)\s*x([a-zA-Z0-9_]+)/g;
    const terms: Term[] = [];
    let match;

    // Sanitize spaces to avoid regex issues
    const sanitized = expr.replace(/\s+/g, '');

    while ((match = termRegex.exec(sanitized)) !== null) {
      const sign = match[1] === '-' ? -1 : 1;
      const coefStr = match[2];
      const coef = coefStr === '' ? 1 : parseFloat(coefStr);
      const varIdxStr = match[3];

      terms.push({
        coef: sign * coef,
        var1: varIdxStr
      });
    }

    if (terms.length === 0) {
      throw new Error(`Could not parse any variable terms in the expression: "${expr}"`);
    }

    return terms;
  }

  calculateQUBO(): void {
    // Initialize QUBO linear weights and quadratic interactions
    this.quboLinear = new Array(this.numQubits).fill(0);
    this.quboQuadratic = {};
    this.quboOffset = 0;

    // 1) Add objective function terms
    for (const term of this.objTerms) {
      const idx = this.varList.indexOf(term.var1);
      this.quboLinear[idx] += term.coef;
    }

    // 2) Add constraint penalty expansions: lambda * (sum a_i x_i - C)^2
    for (const c of this.constraints) {
      const lambda = c.lambda;
      const C = c.target;

      // Map internal variable indices to coefficients for easy lookup inside this constraint
      const coefMap: { [key: number]: number } = {};
      for (const term of c.terms) {
        const idx = this.varList.indexOf(term.var1);
        coefMap[idx] = (coefMap[idx] || 0) + term.coef;
      }

      // Linear terms penalty: lambda * (a_i^2 - 2 * C * a_i) * x_i
      for (const varStr of Object.keys(coefMap)) {
        const i = parseInt(varStr);
        const a_i = coefMap[i];
        this.quboLinear[i] += lambda * (a_i * a_i - 2 * C * a_i);
      }

      // Quadratic terms penalty: 2 * lambda * a_i * a_j * x_i * x_j
      const vars = Object.keys(coefMap).map(v => parseInt(v)).sort((a, b) => a - b);
      for (let idx1 = 0; idx1 < vars.length; idx1++) {
        for (let idx2 = idx1 + 1; idx2 < vars.length; idx2++) {
          const i = vars[idx1];
          const j = vars[idx2];
          const key = `${i},${j}`;
          const val = 2 * lambda * coefMap[i] * coefMap[j];
          this.quboQuadratic[key] = (this.quboQuadratic[key] || 0) + val;
        }
      }

      // Offset term penalty: lambda * C^2
      this.quboOffset += lambda * C * C;
    }
  }

  calculateIsing(): void {
    // Map x_i to (1 - s_i) / 2 to get spin coefficients
    // H = sum h_i Z_i + sum J_ij Z_i Z_j + Offset
    this.isingLinear = new Array(this.numQubits).fill(0);
    this.isingQuadratic = {};
    this.isingOffset = this.quboOffset;

    // Add QUBO linear contributions
    for (let i = 0; i < this.numQubits; i++) {
      const Q_i = this.quboLinear[i];
      // Q_i * x_i = Q_i * (1 - s_i) / 2 = Q_i/2 - Q_i/2 * s_i
      this.isingLinear[i] -= Q_i / 2;
      this.isingOffset += Q_i / 2;
    }

    // Add QUBO quadratic contributions
    for (const key of Object.keys(this.quboQuadratic)) {
      const Q_ij = this.quboQuadratic[key];
      const parts = key.split(',').map(p => parseInt(p));
      const i = parts[0];
      const j = parts[1];

      // Q_ij * x_i * x_j = Q_ij/4 * (1 - s_i - s_j + s_i * s_j)
      // Linear coefficients: -Q_ij/4 for both s_i and s_j
      this.isingLinear[i] -= Q_ij / 4;
      this.isingLinear[j] -= Q_ij / 4;

      // Quadratic coefficient: Q_ij / 4
      this.isingQuadratic[key] = Q_ij / 4;

      // Offset contribution: Q_ij / 4
      this.isingOffset += Q_ij / 4;
    }
  }

  buildFormattedProblem(): void {
    // 1) Objective function
    let objParts: string[] = [];
    this.objTerms.forEach((term, idx) => {
      let coef = term.coef;
      let sign = '';
      if (idx > 0) {
        sign = coef >= 0 ? ' + ' : ' - ';
        coef = Math.abs(coef);
      } else {
        sign = coef >= 0 ? '' : '-';
        coef = Math.abs(coef);
      }
      const coefStr = coef === 1 ? '' : coef.toString();
      objParts.push(`${sign}${coefStr}x<sub>${term.var1}</sub>`);
    });
    this.formattedObjective = objParts.join('');

    // 2) Constraints
    this.formattedConstraints = [];
    this.constraints.forEach((c) => {
      let constParts: string[] = [];
      c.terms.forEach((term, idx) => {
        let coef = term.coef;
        let sign = '';
        if (idx > 0) {
          sign = coef >= 0 ? ' + ' : ' - ';
          coef = Math.abs(coef);
        } else {
          sign = coef >= 0 ? '' : '-';
          coef = Math.abs(coef);
        }
        const coefStr = coef === 1 ? '' : coef.toString();
        constParts.push(`${sign}${coefStr}x<sub>${term.var1}</sub>`);
      });
      const exprStr = constParts.join('');
      let opStr = '=';
      if (c.sense === '<=') {
        opStr = '&le;';
      } else if (c.sense === '>=') {
        opStr = '&ge;';
      }
      this.formattedConstraints.push(`${exprStr} ${opStr} ${c.target} &nbsp;&nbsp;&nbsp;&nbsp;(with &lambda; = ${c.lambda})`);
    });
  }


  generateQiskitCode(): void {
    try {
      localStorage.setItem('annealing_objective', this.objectiveInput);
      localStorage.setItem('annealing_constraints', this.problemInput);
      localStorage.setItem('annealing_lambda', this.globalLambda.toString());

      this.parseInput();
      this.buildFormattedProblem();
      this.calculateQUBO();
      this.calculateIsing();

      // 1) Build variables code block
      let variablesStr = '';
      for (let i = 0; i < this.numQubits; i++) {
        variablesStr += `qp.binary_var("x${this.varList[i]}")\n`;
      }
      variablesStr = variablesStr.trim();

      // 2) Build objective function code block
      let objTermsStr = this.objTerms.map(t => `        "x${t.var1}": ${t.coef},`).join('\n');
      let objectiveStr = `qp.minimize(
    linear={
${objTermsStr}
    }
)`;

      // 3) Build constraints code block
      let constraintsStr = this.constraints.map((c, idx) => {
        let cTermsStr = c.terms.map(t => `        "x${t.var1}": ${t.coef},`).join('\n');
        return `qp.linear_constraint(
    linear={
${cTermsStr}
    },
    sense="${c.sense}",
    rhs=${c.target},
    name="c${idx}",
)`;
      }).join('\n\n');

      // 4) Fetch template and substitute tokens
      if (!this.manager.selectedTemplate || !this.manager.selectedTemplate.fileName || !this.manager.selectedTemplate.fileName.startsWith('annealing')) {
        throw new Error("Please select an annealing template from the Template Manager.");
      }
      let templateCode = this.manager.selectedTemplate.code;

      const lambdaLine = `converter = QuadraticProgramToQubo(penalty=${this.globalLambda})`;

      this.code = templateCode
        .replace('#VARIABLES#', variablesStr)
        .replace('#OBJECTIVE_FUNCTION#', objectiveStr)
        .replace('#CONSTRAINTS#', constraintsStr)
        .replace(/#LAMBDA#/g, lambdaLine);

    } catch (err: any) {
      this.errorMessage = err.message || err;
      this.code = '';
    }
  }

  copiarCodigo(): void {
    if (!this.code) return;
    navigator.clipboard.writeText(this.code).then(() => {
      this.mensajeTemporal = "Qiskit code copied to clipboard successfully!";
      setTimeout(() => this.mensajeTemporal = '', 2000);
    });
  }

  get parsedIsingQuadraticList(): any[] {
    const list: any[] = [];
    for (const key of Object.keys(this.isingQuadratic)) {
      const val = this.isingQuadratic[key];
      const parts = key.split(',');
      list.push({ i: parts[0], j: parts[1], coeff: val });
    }
    return list;
  }

  toggleEditCode() {
    this.isEditingCode = !this.isEditingCode;
  }

  get codeLinesCount(): number {
    if (!this.code) return 15;
    const lines = this.code.split('\n').length;
    return lines > 5 ? lines : 5;
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
      this.transpileService.transpile(this.code ?? '', backendsToTranspile, this.circuitName).subscribe(result => {
        this.transpiledCode = result;
      });
      this.mensajeTemporal = 'The code will be transpiled.';
      setTimeout(() => {
        this.mensajeTemporal = '';
      }, 2000);
    } catch (error) {
      console.error('Error during transpilation:', error);
      this.mensajeTemporal = 'Error during transpilation. Please try again.';
      setTimeout(() => {
        this.mensajeTemporal = '';
      }, 2000);
    }
  }
}
