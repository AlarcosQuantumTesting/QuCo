import { ASTNode, AssignmentNode, CallNode, RepeatNode, SequenceNode } from './quantum-dsl.model';

export type TokenType =
  | 'IDENTIFIER'
  | 'NUMBER'
  | 'STRING'
  | 'DOT'        // · or * or .
  | 'LBRACKET'   // [
  | 'RBRACKET'   // ]
  | 'LBRACE'     // {
  | 'RBRACE'     // }
  | 'LPAREN'     // (
  | 'RPAREN'     // )
  | 'COMMA'      // ,
  | 'EQUALS'     // =
  | 'PLUS'       // +
  | 'MINUS'      // -
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

export class QuantumDslLexer {
  private pos = 0;

  constructor(private input: string) {}

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.input.length) {
      const char = this.input[this.pos];

      // Whitespace
      if (/\s/.test(char)) {
        this.pos++;
        continue;
      }

      // Operators & delimiters
      if (char === '·' || char === '*' || char === '•') {
        tokens.push({ type: 'DOT', value: char, pos: this.pos++ });
      } else if (char === '.') {
        // Dot can be composition operator or decimal in number
        tokens.push({ type: 'DOT', value: '.', pos: this.pos++ });
      } else if (char === '=') {
        tokens.push({ type: 'EQUALS', value: char, pos: this.pos++ });
      } else if (char === '(') {
        tokens.push({ type: 'LPAREN', value: char, pos: this.pos++ });
      } else if (char === ')') {
        tokens.push({ type: 'RPAREN', value: char, pos: this.pos++ });
      } else if (char === '[') {
        tokens.push({ type: 'LBRACKET', value: char, pos: this.pos++ });
      } else if (char === ']') {
        tokens.push({ type: 'RBRACKET', value: char, pos: this.pos++ });
      } else if (char === '{') {
        tokens.push({ type: 'LBRACE', value: char, pos: this.pos++ });
      } else if (char === '}') {
        tokens.push({ type: 'RBRACE', value: char, pos: this.pos++ });
      } else if (char === ',') {
        tokens.push({ type: 'COMMA', value: char, pos: this.pos++ });
      } else if (char === '+') {
        tokens.push({ type: 'PLUS', value: '+', pos: this.pos++ });
      } else if (char === '-') {
        tokens.push({ type: 'MINUS', value: '-', pos: this.pos++ });
      } else if (char === "'" || char === '"') {
        // String literal
        const quote = char;
        const start = this.pos;
        this.pos++;
        let strVal = '';
        while (this.pos < this.input.length && this.input[this.pos] !== quote) {
          strVal += this.input[this.pos++];
        }
        if (this.pos < this.input.length) this.pos++; // skip closing quote
        tokens.push({ type: 'STRING', value: strVal, pos: start });
      } else if (/[0-9]/.test(char)) {
        // Number
        const start = this.pos;
        let numStr = '';
        while (this.pos < this.input.length && /[0-9\.]/.test(this.input[this.pos])) {
          numStr += this.input[this.pos++];
        }
        tokens.push({ type: 'NUMBER', value: numStr, pos: start });
      } else if (/[a-zA-Z_]/.test(char)) {
        // Identifier
        const start = this.pos;
        let idStr = '';
        while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.pos])) {
          idStr += this.input[this.pos++];
        }
        tokens.push({ type: 'IDENTIFIER', value: idStr, pos: start });
      } else {
        // Unrecognized character: skip or record
        this.pos++;
      }
    }

    tokens.push({ type: 'EOF', value: '', pos: this.pos });
    return tokens;
  }
}

export class QuantumDslParser {
  private tokens: Token[] = [];
  private current = 0;

  constructor(input: string) {
    const lexer = new QuantumDslLexer(input);
    this.tokens = lexer.tokenize();
  }

  public parse(): ASTNode {
    if (this.isAtEnd()) {
      return { type: 'SEQUENCE', children: [] } as SequenceNode;
    }

    // Check for assignment: id = expr
    if (this.check('IDENTIFIER') && this.checkNext('EQUALS')) {
      const idToken = this.advance();
      this.advance(); // consume '='
      const expr = this.parseSequence();
      return {
        type: 'ASSIGNMENT',
        identifier: idToken.value,
        expression: expr
      } as AssignmentNode;
    }

    return this.parseSequence();
  }

  private parseSequence(): ASTNode {
    const children: ASTNode[] = [];
    const first = this.parseRepeatable();
    children.push(first);

    while (this.match('DOT')) {
      children.push(this.parseRepeatable());
    }

    if (children.length === 1) {
      return children[0];
    }
    return {
      type: 'SEQUENCE',
      children
    } as SequenceNode;
  }

  private parseRepeatable(): ASTNode {
    let base = this.parsePrimary();

    // Check if followed by repetition `{count}`
    if (this.match('LBRACE')) {
      const countToken = this.consume('NUMBER', 'Expected number of repetitions inside { }');
      this.consume('RBRACE', "Expected '}' after repetition count");
      const count = parseInt(countToken.value, 10);
      base = {
        type: 'REPEAT',
        body: base,
        count: isNaN(count) ? 1 : count
      } as RepeatNode;
    }

    return base;
  }

  private parsePrimary(): ASTNode {
    // 1. Bracketed block [ expr ]
    if (this.match('LBRACKET')) {
      const expr = this.parseSequence();
      this.consume('RBRACKET', "Expected ']' at end of block");
      return expr;
    }

    // 2. Parenthesized block ( expr )
    if (this.match('LPAREN')) {
      const expr = this.parseSequence();
      this.consume('RPAREN', "Expected ')' at end of expression");
      return expr;
    }

    // 3. Function call: Name(arg1, arg2, ...)
    if (this.match('IDENTIFIER')) {
      const name = this.previous().value;
      const args: any[] = [];

      if (this.match('LPAREN')) {
        if (!this.check('RPAREN')) {
          do {
            args.push(this.parseArgument());
          } while (this.match('COMMA'));
        }
        this.consume('RPAREN', "Expected ')' after function arguments");
      }

      return {
        type: 'CALL',
        name,
        args
      } as CallNode;
    }

    throw new Error(`Unexpected token at position ${this.peek().pos}: '${this.peek().value}'`);
  }

  private parseArgument(): any {
    if (this.match('PLUS')) {
      if (this.match('NUMBER')) return parseFloat(this.previous().value);
      return '+';
    }
    if (this.match('MINUS')) {
      if (this.match('NUMBER')) return -parseFloat(this.previous().value);
      return '-';
    }

    let left: any;

    if (this.match('NUMBER')) {
      left = parseFloat(this.previous().value);
    } else if (this.match('STRING')) {
      left = this.previous().value;
    } else if (this.match('IDENTIFIER')) {
      const val = this.previous().value;
      if (val.toLowerCase() === 'pi') left = Math.PI;
      else if (val.toLowerCase() === 'true') left = true;
      else if (val.toLowerCase() === 'false') left = false;
      else left = val;
    } else if (this.match('LBRACKET')) {
      // Array argument: [1, 2, 3]
      const items: any[] = [];
      if (!this.check('RBRACKET')) {
        do {
          items.push(this.parseArgument());
        } while (this.match('COMMA'));
      }
      this.consume('RBRACKET', "Expected ']' at end of array argument");
      return items;
    } else {
      throw new Error(`Invalid argument syntax near '${this.peek().value}'`);
    }

    // Check if followed by binary operation, e.g., n - 1 or n + 1
    if (this.match('MINUS')) {
      const right = this.parseArgument();
      if (typeof left === 'number' && typeof right === 'number') {
        return left - right;
      }
      return `${left} - ${right}`;
    }
    if (this.match('PLUS')) {
      const right = this.parseArgument();
      if (typeof left === 'number' && typeof right === 'number') {
        return left + right;
      }
      return `${left} + ${right}`;
    }

    return left;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkNext(type: TokenType): boolean {
    if (this.current + 1 >= this.tokens.length) return false;
    return this.tokens[this.current + 1].type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(`${message}. Found '${this.peek().value}' at pos ${this.peek().pos}`);
  }
}
