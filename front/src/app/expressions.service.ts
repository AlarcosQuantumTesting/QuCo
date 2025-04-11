import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Expression } from './matrixes/Expression';

@Injectable({
  providedIn: 'root'
})
export class ExpressionsService {
  controller : string = "expressions"

  constructor(private client : HttpClient) { }

  getExpressions(): Observable<Expression[]> {
      return this.client.get<Expression[]>(environment.beUrl + this.controller + "/getExpressions", { responseType : 'json' })
  }

  createExpression<Expression>(expression: Expression): Observable<Expression> {
    return this.client.post<Expression>(environment.beUrl + this.controller + "/createExpression", expression, { responseType: 'json' });
  }

  updateExpression<Expression>(expression: Expression) {
    return this.client.post<Expression>(environment.beUrl + this.controller + "/updateExpression", expression, { responseType : 'json' })
  }

  deleteExpression(id: string): Observable<void> {
    return this.client.delete<void>(`${environment.beUrl + this.controller}/deleteExpression?id=${id}`, { responseType: 'json' });
  }
  
}
