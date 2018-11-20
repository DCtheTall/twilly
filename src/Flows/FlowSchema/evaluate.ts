import Flow, { FlowSetName } from '../Flow';
import FlowSchema from '.';


export const ROOT = '__ROOT__';
export type EvaluatedSchema = Map<string, Flow>;


export function evaluateSchema(
  root: Flow,
  G: FlowSchema,
  initialResult: EvaluatedSchema = <EvaluatedSchema>(new Map()),
  visited: Set<Flow | FlowSchema> = new Set<Flow | FlowSchema>(),
  parentKey: string = '',
): EvaluatedSchema {
  if (!visited.has(root)) {
    root[FlowSetName](ROOT);
    initialResult.set(ROOT, root);
    visited.add(root);
  }
  const keys = Object.keys(G.schema);
  if (keys.length === 0) {
    throw new TypeError(
      'All FlowSchemas must contain at least one Flow object');
  }
  return keys.reduce(
    (acc: EvaluatedSchema, k: string): EvaluatedSchema => {
      const flow = G.schema[k];
      const flowKey = parentKey ? `${parentKey}.${k}` : k;

      if (flow instanceof FlowSchema) {
        if (visited.has(flow)) return acc;
        visited.add(flow);
        return evaluateSchema(root, flow, acc, visited, flowKey);
      }
      // Type checking by FlowSchema constructor ensures this must be a Flow instance

      if (visited.has(flow)) {
        throw new TypeError(
          `All Flows must be unique. Unexpected duplicate name: ${flow.name}`);
      }
      visited.add(flow);
      flow[FlowSetName](flowKey);
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
