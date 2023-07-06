import { describe, expect, it } from "vitest";
import { expectEOF, expectSingleResult, ParseError } from "typescript-parsec";

import * as parser from "./parser";

import { SyntaxKind, Node } from "./ast";
import { TokenKind, lexer } from "./lexer";
import {
  BinaryExpression,
  UnaryExpression,
  NumericLiteral,
  Identifier,
  VariableDeclaration,
  FunctionExpression,
  FunctionParameters,
  FunctionBody,
  FunctionCallExpression,
} from "./factory";

function isParseError(err: unknown): err is ParseError {
  return typeof err === "object" && err !== null && "errorMessage" in err;
}

function parseExpr(input: string) {
  return expectSingleResult(
    expectEOF(parser.Expression.parse(lexer.parse(input)))
  );
}

function parseStat(input: string) {
  return expectSingleResult(
    expectEOF(parser.Statement.parse(lexer.parse(input)))
  );
}

function parseProgram(input: string) {
  return expectSingleResult(
    expectEOF(parser.Program.parse(lexer.parse(input)))
  );
}

type Parser = typeof parseExpr | typeof parseStat | typeof parseProgram;

const expectParsed = (
  expression: string,
  expected: Node,
  parser: Parser = parseExpr
) => {
  const results = parser(expression);

  try {
    expect(results).toStrictEqual(expected);
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

  describe("arithmetic expressions", () => {
    it("parses multiplication", () => {
      expectParsed(
        "1 * 2",
        BinaryExpression(
          NumericLiteral(1),
          TokenKind.Asterisk,
          NumericLiteral(2)
        )
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
    });

    it("parses exponentation", () => {
      expectParsed(
        "2 ** 3",
        BinaryExpression(
          NumericLiteral(2),
          TokenKind.AsteriskAsterisk,
          NumericLiteral(3)
        )
      );

      // 2 ^ (3 ^ 2)
      expectParsed(
        "2 ** 3 ** 2",
        BinaryExpression(
          NumericLiteral(2),
          TokenKind.AsteriskAsterisk,
          BinaryExpression(
            NumericLiteral(3),
            TokenKind.AsteriskAsterisk,
            NumericLiteral(2)
          )
        )
      );

      expectParsed(
        "10 ** 2 * 3",
        BinaryExpression(
          BinaryExpression(
            NumericLiteral(10),
            TokenKind.AsteriskAsterisk,
            NumericLiteral(2)
          ),
          TokenKind.Asterisk,
          NumericLiteral(3)
        )
      );

      expectParsed(
        "10 * 2 ** 3",
        BinaryExpression(
          NumericLiteral(10),
          TokenKind.Asterisk,
          BinaryExpression(
            NumericLiteral(2),
            TokenKind.AsteriskAsterisk,
            NumericLiteral(3)
          )
        )
      );
    });

    //  (parens, exponents, multiplications and division (from left to right), multiplication and subtraction (from left to right)
    it("satisfies PEMDAS", () => {
      expectParsed(
        "-1 * 2",
        BinaryExpression(
          UnaryExpression(TokenKind.Minus, NumericLiteral(1)),
          TokenKind.Asterisk,
          NumericLiteral(2)
        )
      );

      expectParsed(
        "1 + 2 * 2 + 1",
        BinaryExpression(
          BinaryExpression(
            NumericLiteral(1),
            TokenKind.Plus,
            BinaryExpression(
              NumericLiteral(2),
              TokenKind.Asterisk,
              NumericLiteral(2)
            )
          ),
          TokenKind.Plus,
          NumericLiteral(1)
        )
      );
    });
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
      VariableDeclaration(Identifier("a"), NumericLiteral(1)),
      parseStat
    );

    expectParsed(
      "let a = 1 + 2",
      VariableDeclaration(
        Identifier("a"),
        BinaryExpression(NumericLiteral(1), TokenKind.Plus, NumericLiteral(2))
      ),
      parseStat
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
      ),
      parseStat
    );
  });

  it("parses function expression", () => {
    expectParsed(
      // noop
      "() => {}",
      FunctionExpression(FunctionParameters([]), FunctionBody([]))
    );

    try {
      expectParsed(
        "() => {;;;}",
        FunctionExpression(FunctionParameters([]), FunctionBody([]))
      );
    } catch (err) {
      if (!isParseError(err)) {
        throw err;
      }

      expect(err.message).toContain("Unable to consume token: ;");
    }

    expectParsed(
      "() => 1 + 2 ",
      FunctionExpression(
        FunctionParameters([]),
        BinaryExpression(NumericLiteral(1), TokenKind.Plus, NumericLiteral(2))
      )
    );

    expectParsed(
      "(b) => 1",
      FunctionExpression(
        FunctionParameters([Identifier("b")]),
        NumericLiteral(1)
      )
    );

    expectParsed(
      "(b, c) => 1",
      FunctionExpression(
        FunctionParameters([Identifier("b"), Identifier("c")]),
        NumericLiteral(1)
      )
    );

    expectParsed(
      "(b, c) => b + c",
      FunctionExpression(
        FunctionParameters([Identifier("b"), Identifier("c")]),
        BinaryExpression(Identifier("b"), TokenKind.Plus, Identifier("c"))
      )
    );

    expectParsed(
      "(b, c) => { b + c }",
      FunctionExpression(
        FunctionParameters([Identifier("b"), Identifier("c")]),
        FunctionBody([
          BinaryExpression(Identifier("b"), TokenKind.Plus, Identifier("c")),
        ])
      )
    );

    expectParsed(
      "(b, c) => { b + c; b - c }",
      FunctionExpression(
        FunctionParameters([Identifier("b"), Identifier("c")]),
        FunctionBody([
          BinaryExpression(Identifier("b"), TokenKind.Plus, Identifier("c")),
          BinaryExpression(Identifier("b"), TokenKind.Minus, Identifier("c")),
        ])
      )
    );

    expectParsed(
      "(b, c) => { let x = b + c; x }",
      FunctionExpression(
        FunctionParameters([Identifier("b"), Identifier("c")]),
        FunctionBody([
          VariableDeclaration(
            Identifier("x"),
            BinaryExpression(Identifier("b"), TokenKind.Plus, Identifier("c"))
          ),
          Identifier("x"),
        ])
      )
    );
  });

  it("parses function declarations", () => {
    expectParsed(
      "let a = () => 1",
      VariableDeclaration(
        Identifier("a"),
        FunctionExpression(FunctionParameters([]), NumericLiteral(1))
      ),
      parseStat
    );

    expectParsed(
      "let a = (b) => 1",
      VariableDeclaration(
        Identifier("a"),
        FunctionExpression(
          FunctionParameters([Identifier("b")]),
          NumericLiteral(1)
        )
      ),
      parseStat
    );

    expectParsed(
      "let a = (b, c) => { b + c }",
      VariableDeclaration(
        Identifier("a"),
        FunctionExpression(
          FunctionParameters([Identifier("b"), Identifier("c")]),
          FunctionBody([
            BinaryExpression(Identifier("b"), TokenKind.Plus, Identifier("c")),
          ])
        )
      ),
      parseStat
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

  it("parses function call statements", () => {
    expectParsed("a()", FunctionCallExpression(Identifier("a"), []), parseStat);

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

  it("parses programs", () => {
    expectParsed(
      "let a = 1",
      {
        kind: SyntaxKind.Program,
        statements: [VariableDeclaration(Identifier("a"), NumericLiteral(1))],
      },
      parseProgram
    );

    expectParsed(
      "let a = 1; let b = 2",
      {
        kind: SyntaxKind.Program,
        statements: [
          VariableDeclaration(Identifier("a"), NumericLiteral(1)),
          VariableDeclaration(Identifier("b"), NumericLiteral(2)),
        ],
      },
      parseProgram
    );

    expectParsed(
      "let a = 1; let b = 2; let c = 3",
      {
        kind: SyntaxKind.Program,
        statements: [
          VariableDeclaration(Identifier("a"), NumericLiteral(1)),
          VariableDeclaration(Identifier("b"), NumericLiteral(2)),
          VariableDeclaration(Identifier("c"), NumericLiteral(3)),
        ],
      },
      parseProgram
    );

    expectParsed(
      "let a = 1; let b = 2; let c = 3; let d = 4",
      {
        kind: SyntaxKind.Program,
        statements: [
          VariableDeclaration(Identifier("a"), NumericLiteral(1)),
          VariableDeclaration(Identifier("b"), NumericLiteral(2)),
          VariableDeclaration(Identifier("c"), NumericLiteral(3)),
          VariableDeclaration(Identifier("d"), NumericLiteral(4)),
        ],
      },
      parseProgram
    );

    expectParsed(
      "let a = () => 1; let b = a; let c = (d) => { a + 10 };",
      {
        kind: SyntaxKind.Program,
        statements: [
          VariableDeclaration(
            Identifier("a"),
            FunctionExpression(FunctionParameters([]), NumericLiteral(1))
          ),
          VariableDeclaration(Identifier("b"), Identifier("a")),
          VariableDeclaration(
            Identifier("c"),
            FunctionExpression(
              FunctionParameters([Identifier("d")]),
              FunctionBody([
                BinaryExpression(
                  Identifier("a"),
                  TokenKind.Plus,
                  NumericLiteral(10)
                ),
              ])
            )
          ),
        ],
      },
      parseProgram
    );
  });
});
