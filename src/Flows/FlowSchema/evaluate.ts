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
  const keys = Object.keys(G.schema);
  if (keys.length === 0) {
    throw new TypeError(
      'All FlowSchemas must contain at least one Flow object');
  }
  return keys.reduce(
    (acc: EvaluatedSchema, k: string): EvaluatedSchema =>
      {
        const flow = G.schema[k];

        if (flow instanceof FlowSchema) {
          if (visited.has(flow)) return acc;
          visited.add(flow);
          return evaluateSchema(root, flow, acc, visited);
        }
        // Type checking by FlowSchema constructor ensures this must be a Flow instance
        if (acc.has(flow.name) && acc.get(flow.name) !== flow) {
          throw new TypeError(
            `All Flows must have unique names. Unexpected duplicate name: ${flow.name}`);
        }
        if (acc.has(flow.name)) {
          return acc;
        }
        if (flow.length === 0) {
          throw new TypeError(
            `All Flows must perform at least one action. Check flow: ${flow.name}`);
        }
        acc.set(flow.name, flow);
        return acc;
      },
      initialResult,
    );
}
