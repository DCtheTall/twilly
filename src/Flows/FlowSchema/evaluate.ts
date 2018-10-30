import Flow from '../Flow';
import FlowSchema from '.';


export const ROOT = '__ROOT__';
export type EvaluatedSchema = Map<string, Flow>;


const EMPTY_MAP = <EvaluatedSchema>(new Map());
const EMPTY_SET = new Set<FlowSchema>();


export function evaluateSchema(
  root: Flow,
  G: FlowSchema,
  initialResult: EvaluatedSchema = EMPTY_MAP,
  visited: Set<FlowSchema> = EMPTY_SET,
): EvaluatedSchema {
  initialResult.set(root.name, root);
  const evaluated = Object.keys(G.schema).reduce(
    (acc: EvaluatedSchema, k: string): EvaluatedSchema =>
      {
        const flow = G.schema[k];

        if (flow instanceof FlowSchema) {
          if (visited.has(flow)) return;
          visited.add(flow);
          evaluateSchema(root, flow, acc, visited);
        } else { // Type checking by FlowSchema constructor ensures this must be a Flow instance
          if (acc.has(flow.name)) {
            throw new TypeError(
              `All Flows must have unique names. Unexpected duplicate name: ${flow.name}`);
          }
          if (flow.length === 0) {
            // TODO reuse in FlowController
            throw new TypeError(
              'All Flows must perform at least one action');
          }
          acc.set(flow.name, flow);
        }
        return acc;
      }, initialResult);
  if (evaluated.size === 0) {
    throw new TypeError(
      'All FlowSchemas must contain at least one Flow object');
  }
  return evaluated;
}
