export class Expression {
  expressionName: string = ""
  description: string = ""
  jsExpression: string = ""
  type: string = ""

  constructor(name: string, description: string, jsExpression: string, type: string) {
      this.expressionName = name
      this.description = description
      this.jsExpression = jsExpression
      this.type = type
  }

}