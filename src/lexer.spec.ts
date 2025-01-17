import { assert, describe, it } from "vitest";
import { TokenKind, lexer } from "./lexer";

function notUndefined<T>(t: T | undefined): T {
  assert.notStrictEqual(t, undefined);
  return <T>t;
}

describe("lexer", () => {
  it("tokenizes simple number", () => {
    let token = lexer.parse("123");

    token = notUndefined(token);
    assert.strictEqual(token.kind, TokenKind.Number);
    assert.strictEqual(token.text, "123");

    token = token.next;
    assert.strictEqual(token, undefined);
  });

  it("muplitple numbers", () => {
    let token = lexer.parse("123 456");

    while (token !== undefined) {
      token = notUndefined(token);
      assert.strictEqual(token.kind, TokenKind.Number);
      token = token.next;
    }
  });

  it("tokenizes expression", () => {
    let token = lexer.parse("1 + 2 - 3");

    token = notUndefined(token);
    assert.strictEqual(token.kind, TokenKind.Number);
    assert.strictEqual(token.text, "1");

    token = notUndefined(token.next);
    assert.strictEqual(token.kind, TokenKind.Plus);
    assert.strictEqual(token.text, "+");

    token = notUndefined(token.next);
    assert.strictEqual(token.kind, TokenKind.Number);
    assert.strictEqual(token.text, "2");

    token = notUndefined(token.next);
    assert.strictEqual(token.kind, TokenKind.Minus);
    assert.strictEqual(token.text, "-");

    token = notUndefined(token.next);
    assert.strictEqual(token.kind, TokenKind.Number);
    assert.strictEqual(token.text, "3");

    token = token.next;
    assert.strictEqual(token, undefined);
  });

  it("handles identifier", () => {
    let token = lexer.parse("a");

    token = notUndefined(token);
    assert.strictEqual(token.kind, TokenKind.Identifier);
    assert.strictEqual(token.text, "a");

    token = token.next;
    assert.strictEqual(token, undefined);
  });

  it("handles variable declaration", () => {
    let token = lexer.parse("v a = 1");

    token = notUndefined(token);
    assert.strictEqual(token.kind, TokenKind.VarKeyword);
    assert.strictEqual(token.text, "v");

    token = notUndefined(token.next);
    assert.strictEqual(token.kind, TokenKind.Identifier);
    assert.strictEqual(token.text, "a");

    token = notUndefined(token.next);
    assert.strictEqual(token.kind, TokenKind.Equals);
    assert.strictEqual(token.text, "=");

    token = notUndefined(token.next);
    assert.strictEqual(token.kind, TokenKind.Number);
    assert.strictEqual(token.text, "1");

    token = token.next;
    assert.strictEqual(token, undefined);
  });

  it("handles function declaration", () => {
    let token = lexer.parse("(a, b) = a + b");

    token = notUndefined(token);
    assert.strictEqual(token.kind, TokenKind.LeftParen);
    assert.strictEqual(token.text, "(");

    token = notUndefined(token.next);
    assert.strictEqual(token.kind, TokenKind.Identifier);
    assert.strictEqual(token.text, "a");

    token = notUndefined(token.next);
    assert.strictEqual(token.kind, TokenKind.Comma);
    assert.strictEqual(token.text, ",");

    token = notUndefined(token.next);
    assert.strictEqual(token.kind, TokenKind.Identifier);
    assert.strictEqual(token.text, "b");

    token = notUndefined(token.next);
    assert.strictEqual(token.kind, TokenKind.RightParen);
    assert.strictEqual(token.text, ")");

    token = notUndefined(token.next);
    assert.strictEqual(token.kind, TokenKind.Equals);
    assert.strictEqual(token.text, "=");

    token = notUndefined(token.next);
    assert.strictEqual(token.kind, TokenKind.Identifier);
    assert.strictEqual(token.text, "a");

    token = notUndefined(token.next);
    assert.strictEqual(token.kind, TokenKind.Plus);
    assert.strictEqual(token.text, "+");

    token = notUndefined(token.next);
    assert.strictEqual(token.kind, TokenKind.Identifier);
    assert.strictEqual(token.text, "b");

    token = token.next;
    assert.strictEqual(token, undefined);
  });
});
