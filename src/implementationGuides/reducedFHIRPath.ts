// Generated automatically by nearley, version 2.20.0
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }

interface NearleyToken {
  value: any;
  [key: string]: any;
};

interface NearleyLexer {
  reset: (chunk: string, info: any) => void;
  next: () => NearleyToken | undefined;
  save: () => any;
  formatError: (token: never) => string;
  has: (tokenType: string) => boolean;
};

interface NearleyRule {
  name: string;
  symbols: NearleySymbol[];
  postprocess?: (d: any[], loc?: number, reject?: {}) => any;
};

type NearleySymbol = string | { literal: any } | { test: (token: any) => boolean };

interface Grammar {
  Lexer: NearleyLexer | undefined;
  ParserRules: NearleyRule[];
  ParserStart: string;
};

const grammar: Grammar = {
  Lexer: undefined,
  ParserRules: [
    {"name": "Main", "symbols": ["unionExpression"], "postprocess": id},
    {"name": "unionExpression", "symbols": ["unionExpression", "_", {"literal":"|"}, "_", "expression"], "postprocess": d => ([ Array.isArray(d[0]) ? d[0].flat() : d[0], d[4]]).flat()},
    {"name": "unionExpression", "symbols": ["expression"], "postprocess": d => d},
    {"name": "expression", "symbols": ["path"], "postprocess": id},
    {"name": "expression$ebnf$1$subexpression$1", "symbols": [{"literal":"."}, "IDENTIFIER"]},
    {"name": "expression$ebnf$1", "symbols": ["expression$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "expression$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "expression", "symbols": ["path", "simpleWhere", "expression$ebnf$1"], "postprocess": d => ({...d[0], path:`${d[0].path}${d[2] ? `.${d[2][1]}` : ''}`, condition:[`${d[0].path}.${d[1][0]}`, d[1][1], d[1][2]]})},
    {"name": "expression$string$1", "symbols": [{"literal":" "}, {"literal":"a"}, {"literal":"s"}, {"literal":" "}], "postprocess": (d) => d.join('')},
    {"name": "expression$ebnf$2$subexpression$1", "symbols": [{"literal":"."}, "IDENTIFIER"]},
    {"name": "expression$ebnf$2", "symbols": ["expression$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "expression$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "expression", "symbols": [{"literal":"("}, "path", "expression$string$1", "IDENTIFIER", {"literal":")"}, "expression$ebnf$2"], "postprocess": d => ({...d[1], path:`${d[1].path}${d[3][0].toUpperCase() + d[3].substring(1)}${d[5] ? '.' + d[5][1] : ''}`})},
    {"name": "expression", "symbols": ["path", {"literal":"."}, "typeFn", {"literal":"("}, "IDENTIFIER", {"literal":")"}], "postprocess": d => ({...d[0], path:`${d[0].path}${d[4][0].toUpperCase() + d[4].substring(1)}`})},
    {"name": "expression$string$2", "symbols": [{"literal":"."}, {"literal":"w"}, {"literal":"h"}, {"literal":"e"}, {"literal":"r"}, {"literal":"e"}, {"literal":"("}, {"literal":"r"}, {"literal":"e"}, {"literal":"s"}, {"literal":"o"}, {"literal":"l"}, {"literal":"v"}, {"literal":"e"}, {"literal":"("}, {"literal":")"}, {"literal":" "}, {"literal":"i"}, {"literal":"s"}, {"literal":" "}], "postprocess": (d) => d.join('')},
    {"name": "expression", "symbols": ["path", "expression$string$2", "IDENTIFIER", {"literal":")"}], "postprocess": d => ({...d[0], condition: [d[0].path, 'resolve', d[2]]})},
    {"name": "path$ebnf$1", "symbols": []},
    {"name": "path$ebnf$1$subexpression$1", "symbols": [{"literal":"."}, "IDENTIFIER"]},
    {"name": "path$ebnf$1", "symbols": ["path$ebnf$1", "path$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "path", "symbols": ["IDENTIFIER", "path$ebnf$1"], "postprocess": (d) => ({resourceType:d[0], path:[...d[1].flat()].join('').substring(1)})},
    {"name": "simpleWhere$string$1", "symbols": [{"literal":"."}, {"literal":"w"}, {"literal":"h"}, {"literal":"e"}, {"literal":"r"}, {"literal":"e"}, {"literal":"("}], "postprocess": (d) => d.join('')},
    {"name": "simpleWhere", "symbols": ["simpleWhere$string$1", "simpleWhereExp", {"literal":")"}], "postprocess": d => d[1]},
    {"name": "simpleWhereExp", "symbols": ["IDENTIFIER", {"literal":"="}, {"literal":"'"}, "IDENTIFIER", {"literal":"'"}], "postprocess": d => [d[0], d[1], d[3]]},
    {"name": "typeFn$string$1", "symbols": [{"literal":"a"}, {"literal":"s"}], "postprocess": (d) => d.join('')},
    {"name": "typeFn", "symbols": ["typeFn$string$1"]},
    {"name": "typeFn$string$2", "symbols": [{"literal":"i"}, {"literal":"s"}], "postprocess": (d) => d.join('')},
    {"name": "typeFn", "symbols": ["typeFn$string$2"], "postprocess": () => null},
    {"name": "IDENTIFIER$ebnf$1", "symbols": [/[a-zA-Z-]/]},
    {"name": "IDENTIFIER$ebnf$1", "symbols": ["IDENTIFIER$ebnf$1", /[a-zA-Z-]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "IDENTIFIER", "symbols": ["IDENTIFIER$ebnf$1"], "postprocess": d => d[0].join("")},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", /[\s]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": () => null}
  ],
  ParserStart: "Main",
};

export default grammar;
