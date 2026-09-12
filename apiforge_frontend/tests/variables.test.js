import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractVariableNames,
  resolveVariablePrecedence,
  detectUndefinedVariables,
  filterVariablesSafely,
  replaceVariableToken,
} from '../src/features/requests/utils/variableUtils.js';

describe('Step 30: Request Workspace Variable Experience — Unit Verification', () => {
  describe('extractVariableNames regex parsing', () => {
    it('should extract single variable from simple URL', () => {
      const url = 'https://{{baseUrl}}/users';
      const extracted = extractVariableNames(url);
      assert.deepEqual(extracted, ['baseUrl']);
    });

    it('should extract multiple variables with extra whitespace inside brackets', () => {
      const url = 'https://{{  baseUrl  }}/users/{{ userId }}/orders/{{orderId}}';
      const extracted = extractVariableNames(url);
      assert.deepEqual(extracted, ['baseUrl', 'userId', 'orderId']);
    });

    it('should deduplicate multiple occurrences of the same variable', () => {
      const text = '{{token}} and {{token}} with {{ token }}';
      const extracted = extractVariableNames(text);
      assert.deepEqual(extracted, ['token']);
    });

    it('should extract variables from JSON body strings', () => {
      const body = JSON.stringify({
        apiKey: '{{secretApiKey}}',
        nested: {
          targetId: '{{userId}}',
          auth: 'Bearer {{token}}',
        },
      });
      const extracted = extractVariableNames(body);
      assert.deepEqual(extracted, ['secretApiKey', 'userId', 'token']);
    });

    it('should safely return empty array for non-string or falsy input', () => {
      assert.deepEqual(extractVariableNames(null), []);
      assert.deepEqual(extractVariableNames(undefined), []);
      assert.deepEqual(extractVariableNames(''), []);
      assert.deepEqual(extractVariableNames('{notVariable}'), []);
    });
  });

  describe('Precedence resolution (Runtime > Extracted > Environment)', () => {
    const envVariables = [
      { id: '1', key: 'baseUrl', value: 'https://api.dev.com', isSecret: false },
      { id: '2', key: 'token', value: '••••••••', isSecret: true },
      { id: '3', key: 'version', value: 'v1', isSecret: false },
    ];

    const extractions = [
      { id: 'ext-1', variableName: 'token', source: 'json', property: '$.access_token' },
      { id: 'ext-2', variableName: 'userId', source: 'json', property: '$.user.id' },
    ];

    const runtimeVariables = [
      { key: 'baseUrl', value: 'https://override.runner.local' },
    ];

    it('should allow runtime variables to override environment variables', () => {
      const { variableMap } = resolveVariablePrecedence(envVariables, extractions, runtimeVariables);
      const baseUrlVar = variableMap.get('baseUrl');

      assert.equal(baseUrlVar.source, 'runtime');
      assert.equal(baseUrlVar.value, 'https://override.runner.local');
    });

    it('should allow extracted variables to override environment variables', () => {
      const { variableMap } = resolveVariablePrecedence(envVariables, extractions, runtimeVariables);
      const tokenVar = variableMap.get('token');

      assert.equal(tokenVar.source, 'extracted');
      assert.equal(tokenVar.value, '(extracted downstream from json)');
    });

    it('should retain environment variables that are not overridden', () => {
      const { variableMap } = resolveVariablePrecedence(envVariables, extractions, runtimeVariables);
      const versionVar = variableMap.get('version');

      assert.equal(versionVar.source, 'environment');
      assert.equal(versionVar.value, 'v1');
    });

    it('should correctly build knownKeys set containing all sources', () => {
      const { knownKeys } = resolveVariablePrecedence(envVariables, extractions, runtimeVariables);
      assert.equal(knownKeys.has('baseUrl'), true);
      assert.equal(knownKeys.has('token'), true);
      assert.equal(knownKeys.has('userId'), true);
      assert.equal(knownKeys.has('version'), true);
      assert.equal(knownKeys.has('missingKey'), false);
    });
  });

  describe('Undefined variable detection across request payload', () => {
    const knownKeys = new Set(['baseUrl', 'token', 'userId']);

    it('should identify undefined variables when referenced in request', () => {
      const referenced = ['baseUrl', 'unknownSecret', 'userId', 'missingVar'];
      const undefinedVars = detectUndefinedVariables(referenced, knownKeys);

      assert.deepEqual(undefinedVars, ['unknownSecret', 'missingVar']);
    });

    it('should return empty list when all referenced variables exist', () => {
      const referenced = ['baseUrl', 'token'];
      const undefinedVars = detectUndefinedVariables(referenced, knownKeys);

      assert.deepEqual(undefinedVars, []);
    });
  });

  describe('Security and secret value confidentiality', () => {
    const variables = [
      { key: 'apiKey', isSecret: true, value: '••••••••', description: 'Production API Key' },
      { key: 'baseUrl', isSecret: false, value: 'https://api.example.com', description: 'Base Host' },
      { key: 'clientSecret', isSecret: true, value: '••••••••', description: 'Client credentials' },
    ];

    it('should search by key name without exposing secret values', () => {
      const results = filterVariablesSafely(variables, 'api');
      assert.equal(results.length, 1);
      assert.equal(results[0].key, 'apiKey');
      assert.equal(results[0].value, '••••••••');
    });

    it('should search by description safely', () => {
      const results = filterVariablesSafely(variables, 'credentials');
      assert.equal(results.length, 1);
      assert.equal(results[0].key, 'clientSecret');
    });

    it('should never match or filter against plaintext secret content', () => {
      const results = filterVariablesSafely(variables, 'secret12345');
      assert.equal(results.length, 0);
    });
  });

  describe('Autocomplete replacement logic', () => {
    it('should complete partial prefix to {{variable}} in URL', () => {
      const current = 'https://{{base/users';
      const cursorPos = 'https://{{base'.length;
      const result = replaceVariableToken(current, cursorPos, 'baseUrl');

      assert.equal(result, 'https://{{baseUrl}}/users');
    });

    it('should not duplicate closing braces when cursor is between {{ and }}', () => {
      const current = 'Bearer {{tok}}';
      const cursorPos = 'Bearer {{tok'.length;
      const result = replaceVariableToken(current, cursorPos, 'accessToken');

      assert.equal(result, 'Bearer {{accessToken}}');
    });

    it('should append {{variable}} if no opening braces exist', () => {
      const current = 'Authorization: ';
      const cursorPos = current.length;
      const result = replaceVariableToken(current, cursorPos, 'token');

      assert.equal(result, 'Authorization: {{token}}');
    });
  });
});
