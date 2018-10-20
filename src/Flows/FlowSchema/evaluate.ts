import { NAME } from '../../symbols';

import Flow from '../Flow';
import FlowSchema from './';


export type EvaluatedSchema = Map<string, Flow>;


type F = Set<FlowSchema>;

const EMPTY_MAP = <EvaluatedSchema>(new Map());
const EMPTY_SET = <F>(new Set());


/**
 *
 * @param schema the flow schema being evaluated
 * @returns a schema evaluated using DFS to create a flat map of interactions
 */
export function evaluateSchema(
  root: Flow,
  G: FlowSchema,
  initialResult: EvaluatedSchema = EMPTY_MAP,
  visited: F = EMPTY_SET,
): EvaluatedSchema {
  initialResult.set(root[NAME], root);
  const evaluated = Object.keys(G.schema).reduce(
    (acc: EvaluatedSchema, k: string): EvaluatedSchema =>
      {
        const o = G.schema[k];
        if (o instanceof FlowSchema) {
          if (visited.has(o)) return;
          visited.add(o);
          evaluateSchema(root, o, acc, visited);
        } else { // Type checking by FlowSchema constructor ensures this must be a Flow instance
          if (acc.has(o[NAME])) {
            throw new TypeError(
              `All Flows must have unique names. Unexpected duplicate name: ${o[NAME]}`);
          }
          acc.set(o[NAME], o);
        }
        return acc;
      }, initialResult);
  if (Object.keys(evaluated).length === 0) {
    throw new TypeError(
      'All FlowSchemas must contain at least one Flow object');
  }
  return evaluated;
}
