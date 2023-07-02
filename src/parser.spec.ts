import { describe, expect, it } from "vitest";
import { expectEOF, expectSingleResult } from "typescript-parsec";

import * as parser from "./parser";

import { SyntaxKind, Node } from "./ast";
import { TokenKind } from "./lexer";
import {
  BinaryExpression,
  UnaryExpression,
  NumericLiteral,
  Identifier,
  VariableDeclaration,
  FunctionExpression,
  FunctionParameters,
  Block,
  FunctionCallExpression,
} from "./factory";

const expectParsed = (expression: string, expected: Node) => {
  const results = parser.parse(expression);

  try {
    expect(expectSingleResult(expectEOF(results))).toStrictEqual(expected);
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "errorMessage" in err &&
      err.errorMessage === "Multiple results are returned."
    ) {
      console.dir({ results }, { depth: 99 });
    }

    console.dir({ results }, { depth: 5 });
    throw err;
  }
};

describe("parser", () => {
  it("parses numeric literals", () => {
    expectParsed("1", {
      kind: SyntaxKind.NumericLiteral,
      value: 1,
    });

    expectParsed("1000.0002", {
      kind: SyntaxKind.NumericLiteral,
      value: 1000.0002,
    });
  });

  it("parses unary expressions", () => {
    expectParsed("-1.5", UnaryExpression(TokenKind.Minus, NumericLiteral(1.5)));
  });

  it("parses arithmetic expressions", () => {
    expectParsed(
      "1 * 2",
      BinaryExpression(NumericLiteral(1), TokenKind.Asterisk, NumericLiteral(2))
    );

    expectParsed("1 * 2 * 3", {
      kind: SyntaxKind.BinaryExpression,
      operator: TokenKind.Asterisk,
      left: {
        kind: SyntaxKind.BinaryExpression,
        operator: TokenKind.Asterisk,
        left: NumericLiteral(1),
        right: NumericLiteral(2),
      },
      right: NumericLiteral(3),
    });

    expectParsed(
      "1 + 2 * 3",
      BinaryExpression(
        NumericLiteral(1),
        TokenKind.Plus,
        BinaryExpression(
          NumericLiteral(2),
          TokenKind.Asterisk,
          NumericLiteral(3)
        )
      )
    );

    expectParsed(
      "1 * 2 + 3",
      BinaryExpression(
        BinaryExpression(
          NumericLiteral(1),
          TokenKind.Asterisk,
          NumericLiteral(2)
        ),
        TokenKind.Plus,
        NumericLiteral(3)
      )
    );

    expectParsed(
      "-1 * 2",
      BinaryExpression(
        UnaryExpression(TokenKind.Minus, NumericLiteral(1)),
        TokenKind.Asterisk,
        NumericLiteral(2)
      )
    );
  });

  it("parses parentheses", () => {
    expectParsed("(1)", NumericLiteral(1));

    expectParsed(
      "(1 + 2)",
      BinaryExpression(NumericLiteral(1), TokenKind.Plus, NumericLiteral(2))
    );

    expectParsed(
      "1 * (2 + 3)",
      BinaryExpression(
        NumericLiteral(1),
        TokenKind.Asterisk,
        BinaryExpression(NumericLiteral(2), TokenKind.Plus, NumericLiteral(3))
      )
    );

    expectParsed(
      "(1 + 2) * 3",
      BinaryExpression(
        BinaryExpression(NumericLiteral(1), TokenKind.Plus, NumericLiteral(2)),
        TokenKind.Asterisk,
        NumericLiteral(3)
      )
    );
  });

  it("parses identifiers", () => {
    expectParsed("a", Identifier("a"));

    expectParsed(
      "a + b",
      BinaryExpression(Identifier("a"), TokenKind.Plus, Identifier("b"))
    );

    expectParsed(
      "a + b * c",
      BinaryExpression(
        Identifier("a"),
        TokenKind.Plus,
        BinaryExpression(Identifier("b"), TokenKind.Asterisk, Identifier("c"))
      )
    );

    expectParsed(
      "a * b + c",
      BinaryExpression(
        BinaryExpression(Identifier("a"), TokenKind.Asterisk, Identifier("b")),
        TokenKind.Plus,
        Identifier("c")
      )
    );

    expectParsed(
      "a * (b + c) / 2",
      BinaryExpression(
        BinaryExpression(
          Identifier("a"),
          TokenKind.Asterisk,
          BinaryExpression(Identifier("b"), TokenKind.Plus, Identifier("c"))
        ),
        TokenKind.RightSlash,
        NumericLiteral(2)
      )
    );

    expectParsed(
      "2 * (a + b) * c",
      BinaryExpression(
        BinaryExpression(
          NumericLiteral(2),
          TokenKind.Asterisk,
          BinaryExpression(Identifier("a"), TokenKind.Plus, Identifier("b"))
        ),
        TokenKind.Asterisk,
        Identifier("c")
      )
    );
  });

  it("parses assignments", () => {
    expectParsed(
      "a = 1",
      BinaryExpression(Identifier("a"), TokenKind.Equals, NumericLiteral(1))
    );
  });

  it("parses variable declarations", () => {
    expectParsed(
      "let a = 1",
      VariableDeclaration(Identifier("a"), NumericLiteral(1))
    );

    expectParsed(
      "let a = 1 + 2",
      VariableDeclaration(
        Identifier("a"),
        BinaryExpression(NumericLiteral(1), TokenKind.Plus, NumericLiteral(2))
      )
    );

    expectParsed(
      "let a = 1 + 2 * 3",
      VariableDeclaration(
        Identifier("a"),
        BinaryExpression(
          NumericLiteral(1),
          TokenKind.Plus,
          BinaryExpression(
            NumericLiteral(2),
            TokenKind.Asterisk,
            NumericLiteral(3)
          )
        )
      )
    );
  });

  it("parses function declarations", () => {
    expectParsed(
      "func a() = 1",
      FunctionExpression(
        Identifier("a"),
        FunctionParameters([]),
        NumericLiteral(1)
      )
    );

    expectParsed(
      "func a(b) = 1",
      FunctionExpression(
        Identifier("a"),
        FunctionParameters([Identifier("b")]),
        NumericLiteral(1)
      )
    );

    expectParsed(
      "func a(b, c) = 1",
      FunctionExpression(
        Identifier("a"),
        FunctionParameters([Identifier("b"), Identifier("c")]),
        NumericLiteral(1)
      )
    );

    expectParsed(
      "func a(b, c) = b + c",
      FunctionExpression(
        Identifier("a"),
        FunctionParameters([Identifier("b"), Identifier("c")]),
        BinaryExpression(Identifier("b"), TokenKind.Plus, Identifier("c"))
      )
    );

    expectParsed(
      "func a(b, c) = { b + c }",
      FunctionExpression(
        Identifier("a"),
        FunctionParameters([Identifier("b"), Identifier("c")]),
        Block([
          BinaryExpression(Identifier("b"), TokenKind.Plus, Identifier("c")),
        ])
      )
    );

    expectParsed(
      "func a(b, c) = { b + c; b - c }",
      FunctionExpression(
        Identifier("a"),
        FunctionParameters([Identifier("b"), Identifier("c")]),
        Block([
          BinaryExpression(Identifier("b"), TokenKind.Plus, Identifier("c")),
          BinaryExpression(Identifier("b"), TokenKind.Minus, Identifier("c")),
        ])
      )
    );
  });

  it("parses function calls", () => {
    expectParsed("a()", FunctionCallExpression(Identifier("a"), []));

    expectParsed(
      "a(b)",
      FunctionCallExpression(Identifier("a"), [Identifier("b")])
    );

    expectParsed(
      "a(b, c)",
      FunctionCallExpression(Identifier("a"), [
        Identifier("b"),
        Identifier("c"),
      ])
    );

    expectParsed(
      "a(b, c, d)",
      FunctionCallExpression(Identifier("a"), [
        Identifier("b"),
        Identifier("c"),
        Identifier("d"),
      ])
    );

    expectParsed(
      "a(1 + 2)",
      FunctionCallExpression(Identifier("a"), [
        BinaryExpression(NumericLiteral(1), TokenKind.Plus, NumericLiteral(2)),
      ])
    );

    expectParsed(
      "a(b + c)",
      FunctionCallExpression(Identifier("a"), [
        BinaryExpression(Identifier("b"), TokenKind.Plus, Identifier("c")),
      ])
    );

    expectParsed(
      "a(b, c + d)",
      FunctionCallExpression(Identifier("a"), [
        Identifier("b"),
        BinaryExpression(Identifier("c"), TokenKind.Plus, Identifier("d")),
      ])
    );
  });
});