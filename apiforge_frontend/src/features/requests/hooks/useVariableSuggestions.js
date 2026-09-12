import { useMemo } from 'react';
import { useEnvironmentsQuery, useVariablesQuery } from '../../environments/hooks/useEnvironments';
import useRequestStore from '../store/requestStore';
import {
  VARIABLE_REGEX,
  extractVariableNames,
  filterVariablesSafely,
  resolveVariablePrecedence,
} from '../utils/variableUtils';

export { VARIABLE_REGEX, extractVariableNames, filterVariablesSafely };

/**
 * Hook providing all discoverable variables in the active workspace context:
 * 1. Runtime variables (if supplied)
 * 2. Extracted variables configured in the request settings
 * 3. Active environment variables
 *
 * Precedence: Runtime > Extracted > Environment
 */
export function useVariableSuggestions(workspaceId, runtimeVars = []) {
  const { data: environments = [] } = useEnvironmentsQuery(workspaceId);
  const activeEnv = useMemo(() => environments.find((e) => e.isActive) || null, [environments]);
  const { data: envVariables = [], isLoading: isLoadingEnvVars } = useVariablesQuery(
    workspaceId,
    activeEnv?.id
  );

  const requestSettings = useRequestStore((state) => state.settings);
  const extractions = useMemo(() => requestSettings?.extract || [], [requestSettings]);

  // Aggregate with precedence
  const { allVariables, knownVariableKeys, variableMap } = useMemo(() => {
    const { variables, knownKeys, variableMap: map } = resolveVariablePrecedence(
      envVariables,
      extractions,
      runtimeVars
    );

    // Attach active environment name to environment-sourced variables
    if (activeEnv) {
      for (const v of variables) {
        if (v.source === 'environment') {
          v.envName = activeEnv.name;
        }
      }
    }

    return {
      allVariables: variables,
      knownVariableKeys: knownKeys,
      variableMap: map,
    };
  }, [activeEnv, envVariables, extractions, runtimeVars]);

  const getVariable = (name) => {
    if (!name) return null;
    const clean = String(name).replace(/[{}]/g, '').trim();
    return variableMap.get(clean) || null;
  };

  const isVariableKnown = (name) => {
    if (!name) return false;
    const clean = String(name).replace(/[{}]/g, '').trim();
    return knownVariableKeys.has(clean);
  };

  /**
   * Filter variables by search text safely.
   */
  const filterVariables = (query = '') => {
    return filterVariablesSafely(allVariables, query);
  };

  return {
    allVariables,
    knownVariableKeys,
    activeEnv,
    isLoadingEnvVars,
    getVariable,
    isVariableKnown,
    filterVariables,
  };
}

