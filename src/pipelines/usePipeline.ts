import { useCallback, useRef, useState } from 'react';

/**
 * useReducer that hands back the next state right away, so a handler can start the AI call the reducer
 * just asked for. Late results go through the same reducer, which ignores them if the step moved on.
 */
export function usePipeline<S, E>(reduce: (s: S, e: E) => S, initial: S): [S, (e: E) => S] {
  const ref = useRef(initial);
  const [state, setState] = useState(initial);
  const send = useCallback(
    (e: E) => {
      ref.current = reduce(ref.current, e);
      setState(ref.current);
      return ref.current;
    },
    [reduce],
  );
  return [state, send];
}
