# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

# Minimal subset of the FHIRPath grammar required to parse the FHIRPath SearchParameter expressions
# See the docs for the syntax of this file at https://nearley.js.org/docs/grammar

Main -> unionExpression                                  {% id %}

unionExpression -> unionExpression _ "|" _ expression    {% d => ([ Array.isArray(d[0]) ? d[0].flat() : d[0], d[4]]).flat() %}
	| expression                                         {% d => d %}

expression-> path                                        {% id %}
	| path simpleWhere ("." IDENTIFIER):?                {% d => ({...d[0], path:`${d[0].path}${d[2] ? `.${d[2][1]}` : ''}`, condition:[`${d[0].path}.${d[1][0]}`, d[1][1], d[1][2]]}) %}
	| "(" path " as " IDENTIFIER ")" ("." IDENTIFIER):?  {% d => ({...d[1], path:`${d[1].path}${d[3][0].toUpperCase() + d[3].substring(1)}${d[5] ? '.' + d[5][1] : ''}`}) %}
	| path "." typeFn "(" IDENTIFIER ")"                 {% d => ({...d[0], path:`${d[0].path}${d[4][0].toUpperCase() + d[4].substring(1)}`}) %}
	| path ".where(resolve() is " IDENTIFIER ")"         {% d => ({...d[0], condition: [d[0].path, 'resolve', d[2]]}) %}

path -> IDENTIFIER ("." IDENTIFIER):*                    {% (d) => ({resourceType:d[0], path:[...d[1].flat()].join('').substring(1)}) %}

simpleWhere -> ".where(" simpleWhereExp ")"              {% d => d[1] %}

simpleWhereExp-> IDENTIFIER "=" "'" IDENTIFIER "'"       {% d => [d[0], d[1], d[3]] %}

typeFn -> "as" | "is"                                    {% () => null %}

IDENTIFIER -> [a-zA-Z-]:+                                {% d => d[0].join("") %}

_ -> [\s]:*                                              {% () => null %}
