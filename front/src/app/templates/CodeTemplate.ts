export class CodeTemplate {
  fileName: string = ""
  description: string = ""
  code: string = ""

  constructor(name: string, description: string, code: string) {
    this.fileName = name
    this.description = description
    this.code = code
  }

  get displayName(): string {
    return this.fileName.replace('.template.txt', '');
  }

  getForgottenTokens(): string[] {
    const requiredTokens = ["#QUBITS#", "#OUTPUT_QUBITS#", "#INITIALIZE#", "#CALCULUS#", "#MEASURES#"]
    let r: string[] = [];
    for (let token of requiredTokens) {
      if (!this.code.includes(token))
        r.push(token)
    }
    return r
  }

}