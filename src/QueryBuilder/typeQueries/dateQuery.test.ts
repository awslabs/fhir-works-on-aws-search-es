/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import each from 'jest-each';
import { dateQuery, parseDateSearchParam } from './dateQuery';
import { FHIRSearchParametersRegistry } from '../../FHIRSearchParametersRegistry';

const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1');
const birthdateParam = fhirSearchParametersRegistry.getSearchParameter('Patient', 'birthdate')!.compiled[0];

describe('parseDateSearchParam', () => {
    describe('valid inputs', () => {
        test('YYYY', () => {
            expect(parseDateSearchParam('2020')).toMatchInlineSnapshot(`
                Object {
                  "prefix": "eq",
                  "range": Object {
                    "end": 2020-12-31T23:59:59.999Z,
                    "start": 2020-01-01T00:00:00.000Z,
                  },
                }
            `);
        });
        test('YYYY-MM', () => {
            expect(parseDateSearchParam('2020-02')).toMatchInlineSnapshot(`
                Object {
                  "prefix": "eq",
                  "range": Object {
                    "end": 2020-02-29T23:59:59.999Z,
                    "start": 2020-02-01T00:00:00.000Z,
                  },
                }
            `);
        });
        test('YYYY-MM-DD', () => {
            expect(parseDateSearchParam('2020-02-02')).toMatchInlineSnapshot(`
                Object {
                  "prefix": "eq",
                  "range": Object {
                    "end": 2020-02-02T23:59:59.999Z,
                    "start": 2020-02-02T00:00:00.000Z,
                  },
                }
            `);
        });
        test('YYYY-MM-DDT:hh:mm', () => {
            expect(parseDateSearchParam('2020-02-02T07:07')).toMatchInlineSnapshot(`
                Object {
                  "prefix": "eq",
                  "range": Object {
                    "end": 2020-02-02T07:07:59.999Z,
                    "start": 2020-02-02T07:07:00.000Z,
                  },
                }
            `);
        });
        test('YYYY-MM-DDT:hh:mm:ss', () => {
            expect(parseDateSearchParam('2020-02-02T07:07:07')).toMatchInlineSnapshot(`
                Object {
                  "prefix": "eq",
                  "range": Object {
                    "end": 2020-02-02T07:07:07.999Z,
                    "start": 2020-02-02T07:07:07.000Z,
                  },
                }
            `);
        });
        test('YYYY-MM-DDT:hh:mm:ss.sss', () => {
            expect(parseDateSearchParam('2020-02-02T07:07:07.777')).toMatchInlineSnapshot(`
                Object {
                  "prefix": "eq",
                  "range": Object {
                    "end": 2020-02-02T07:07:07.777Z,
                    "start": 2020-02-02T07:07:07.777Z,
                  },
                }
            `);
        });
        test('YYYY-MM-DDT:hh:mm:ssZ', () => {
            expect(parseDateSearchParam('2020-02-02T07:07:07Z')).toMatchInlineSnapshot(`
                Object {
                  "prefix": "eq",
                  "range": Object {
                    "end": 2020-02-02T07:07:07.999Z,
                    "start": 2020-02-02T07:07:07.000Z,
                  },
                }
            `);
        });
        test('YYYY-MM-DDT:hh:mm:ss+hh:mm', () => {
            expect(parseDateSearchParam('2020-02-02T07:07:07+07:00')).toMatchInlineSnapshot(`
                Object {
                  "prefix": "eq",
                  "range": Object {
                    "end": 2020-02-02T00:07:07.999Z,
                    "start": 2020-02-02T00:07:07.000Z,
                  },
                }
            `);
        });
    });

    describe('invalid inputs', () => {
        each([
            ['badpre2020-02-02'],
            ['This is not a date at all'],
            ['2020-99'],
            ['2020-99-99'],
            ['2020/02/02'],
            ['2020-02-02T07'],
            ['2020-02-02T07:07:07someSuffix'],
            ['2020-02-02someSuffix'],
        ]).test('%s', param => {
            expect(() => parseDateSearchParam(param)).toThrow(InvalidSearchParameterError);
        });
    });
});

describe('dateQuery', () => {
    test('no prefix', () => {
        expect(dateQuery(birthdateParam, '1999-09-09')).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "range": Object {
                      "birthDate": Object {
                        "gte": 1999-09-09T00:00:00.000Z,
                        "lte": 1999-09-09T23:59:59.999Z,
                      },
                    },
                  },
                  Object {
                    "bool": Object {
                      "must": Array [
                        Object {
                          "range": Object {
                            "birthDate.start": Object {
                              "gte": 1999-09-09T00:00:00.000Z,
                            },
                          },
                        },
                        Object {
                          "range": Object {
                            "birthDate.end": Object {
                              "lte": 1999-09-09T23:59:59.999Z,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            }
        `);
    });
    test('eq', () => {
        expect(dateQuery(birthdateParam, 'eq1999-09-09')).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "range": Object {
                      "birthDate": Object {
                        "gte": 1999-09-09T00:00:00.000Z,
                        "lte": 1999-09-09T23:59:59.999Z,
                      },
                    },
                  },
                  Object {
                    "bool": Object {
                      "must": Array [
                        Object {
                          "range": Object {
                            "birthDate.start": Object {
                              "gte": 1999-09-09T00:00:00.000Z,
                            },
                          },
                        },
                        Object {
                          "range": Object {
                            "birthDate.end": Object {
                              "lte": 1999-09-09T23:59:59.999Z,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            }
        `);
    });
    test('ne', () => {
        expect(dateQuery(birthdateParam, 'ne1999-09-09')).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "bool": Object {
                      "should": Array [
                        Object {
                          "range": Object {
                            "birthDate": Object {
                              "gt": 1999-09-09T23:59:59.999Z,
                            },
                          },
                        },
                        Object {
                          "range": Object {
                            "birthDate": Object {
                              "lt": 1999-09-09T00:00:00.000Z,
                            },
                          },
                        },
                      ],
                    },
                  },
                  Object {
                    "bool": Object {
                      "must_not": Object {
                        "bool": Object {
                          "must": Array [
                            Object {
                              "range": Object {
                                "birthDate.start": Object {
                                  "gte": 1999-09-09T00:00:00.000Z,
                                },
                              },
                            },
                            Object {
                              "range": Object {
                                "birthDate.end": Object {
                                  "lte": 1999-09-09T23:59:59.999Z,
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            }
        `);
    });
    test('lt', () => {
        expect(dateQuery(birthdateParam, 'lt1999-09-09')).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "range": Object {
                      "birthDate": Object {
                        "lt": 1999-09-09T23:59:59.999Z,
                      },
                    },
                  },
                  Object {
                    "range": Object {
                      "birthDate.start": Object {
                        "lte": 1999-09-09T23:59:59.999Z,
                      },
                    },
                  },
                ],
              },
            }
        `);
    });
    test('le', () => {
        expect(dateQuery(birthdateParam, 'le1999-09-09')).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "range": Object {
                      "birthDate": Object {
                        "lte": 1999-09-09T23:59:59.999Z,
                      },
                    },
                  },
                  Object {
                    "range": Object {
                      "birthDate.start": Object {
                        "lte": 1999-09-09T23:59:59.999Z,
                      },
                    },
                  },
                ],
              },
            }
        `);
    });
    test('gt', () => {
        expect(dateQuery(birthdateParam, 'gt1999-09-09')).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "range": Object {
                      "birthDate": Object {
                        "gt": 1999-09-09T00:00:00.000Z,
                      },
                    },
                  },
                  Object {
                    "range": Object {
                      "birthDate.end": Object {
                        "gte": 1999-09-09T00:00:00.000Z,
                      },
                    },
                  },
                ],
              },
            }
        `);
    });
    test('ge', () => {
        expect(dateQuery(birthdateParam, 'ge1999-09-09')).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "range": Object {
                      "birthDate": Object {
                        "gte": 1999-09-09T00:00:00.000Z,
                      },
                    },
                  },
                  Object {
                    "range": Object {
                      "birthDate.end": Object {
                        "gte": 1999-09-09T00:00:00.000Z,
                      },
                    },
                  },
                ],
              },
            }
        `);
    });
    test('sa', () => {
        expect(dateQuery(birthdateParam, 'sa1999-09-09')).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "range": Object {
                      "birthDate": Object {
                        "gt": 1999-09-09T23:59:59.999Z,
                      },
                    },
                  },
                  Object {
                    "range": Object {
                      "birthDate.start": Object {
                        "gt": 1999-09-09T23:59:59.999Z,
                      },
                    },
                  },
                ],
              },
            }
        `);
    });
    test('eb', () => {
        expect(dateQuery(birthdateParam, 'eb1999-09-09')).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "range": Object {
                      "birthDate": Object {
                        "lt": 1999-09-09T00:00:00.000Z,
                      },
                    },
                  },
                  Object {
                    "range": Object {
                      "birthDate.end": Object {
                        "lt": 1999-09-09T00:00:00.000Z,
                      },
                    },
                  },
                ],
              },
            }
        `);
    });
});
