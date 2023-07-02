import * as ast from "./ast";
import type { OperatorTokenKind, TokenKind } from "./lexer";

export function NumericLiteral(value: number): ast.NumericLiteral {
  return {
    kind: ast.SyntaxKind.NumericLiteral,
    value,
  } as const;
}

export function BinaryExpression(
  left: ast.Expression,
  operator: OperatorTokenKind,
  right: ast.Expression
): ast.BinaryExpression {
  return {
    kind: ast.SyntaxKind.BinaryExpression,
    left,
    operator,
    right,
  } as const;
}

export function UnaryExpression(
  operator: TokenKind.Minus,
  operand: ast.Expression
): ast.UnaryExpression {
  return {
    kind: ast.SyntaxKind.UnaryExpression,
    operator,
    operand,
  } as const;
}

export function Identifier(name: string): ast.Identifier {
  return {
    kind: ast.SyntaxKind.Identifier,
    name,
  } as const;
}

export function VariableDeclaration(
  name: ast.Identifier,
  initializer: ast.Expression
): ast.VariableDeclaration {
  return {
    kind: ast.SyntaxKind.VariableDeclaration,
    name,
    initializer,
  } as const;
}

export function FunctionExpression(
  name: ast.Identifier,
  parameters: ast.FunctionParameters,
  body: ast.Block | ast.Expression
): ast.FunctionExpression {
  return {
    kind: ast.SyntaxKind.Function,
    name,
    parameters,
    body,
  } as const;
}

export function FunctionParameters(
  parameters: ast.Identifier[]
): ast.FunctionParameters {
  return {
    kind: ast.SyntaxKind.FunctionParameters,
    parameters,
  } as const;
}

export function Block(statements: ast.Expression[]): ast.Block {
  return {
    kind: ast.SyntaxKind.Block,
    statements,
  } as const;
}

export function FunctionCallExpression(
  name: ast.Identifier,
  args: ast.Expression[]
): ast.FunctionCall {
  return {
    kind: ast.SyntaxKind.FunctionCall,
    name,
    arguments: args,
  } as const;
}