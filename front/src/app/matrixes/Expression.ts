export class Expression {
  expressionName: string = ""
  description: string = ""
  jsExpression: string = ""

  constructor(name: string, description: string, jsExpression: string) {
      this.expressionName = name
      this.description = description
      this.jsExpression = jsExpression
  }

}