export class Expression {
  expressionName: string = ""
  description: string = ""
  jsExpression: string = ""

  constructor(name: string, description: string, jsExpression: string) {
      this.expressionName = name
      this.description = description
      this.jsExpression = jsExpression
  }

  // getForgottenTokens() : string[] {
  //   const requiredTokens = [ "#QUBITS#", "#OUTPUT_QUBITS#", "#INITIALIZE#", "#CALCULUS#", "#MEASURES#" ]
  //   let r : string[] = [];
  //   for (let token of requiredTokens) {
  //     if (!this.code.includes(token))
  //       r.push(token)
  //   }
  //   return r
  // }

}