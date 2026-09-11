import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listTests,
  getTest,
  createTest,
  updateTest,
  deleteTest,
  runTest,
  createAssertion,
  updateAssertion,
  deleteAssertion,
} from '../services/testApi';

/**
 * Hook to query all tests for a request
 */
export function useApiTestsQuery(workspaceId, requestId) {
  return useQuery({
    queryKey: ['tests', workspaceId, requestId],
    queryFn: () => listTests(workspaceId, requestId),
    enabled: Boolean(workspaceId && requestId),
    staleTime: 30000,
  });
}

/**
 * Hook to query a single test by ID
 */
export function useApiTestQuery(workspaceId, requestId, testId) {
  return useQuery({
    queryKey: ['test', workspaceId, requestId, testId],
    queryFn: () => getTest(workspaceId, requestId, testId),
    enabled: Boolean(workspaceId && requestId && testId),
    staleTime: 30000,
  });
}

/**
 * Hook to create a test definition
 */
export function useCreateTestMutation(workspaceId, requestId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createTest(workspaceId, requestId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tests', workspaceId, requestId],
      });
    },
  });
}

/**
 * Hook to update a test definition
 */
export function useUpdateTestMutation(workspaceId, requestId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ testId, ...payload }) =>
      updateTest(workspaceId, requestId, testId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tests', workspaceId, requestId],
      });
      if (variables?.testId) {
        queryClient.invalidateQueries({
          queryKey: ['test', workspaceId, requestId, variables.testId],
        });
      }
    },
  });
}

/**
 * Hook to delete a test definition
 */
export function useDeleteTestMutation(workspaceId, requestId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (testId) => deleteTest(workspaceId, requestId, testId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tests', workspaceId, requestId],
      });
    },
  });
}

/**
 * Hook to execute a test and evaluate its assertions
 */
export function useRunTestMutation(workspaceId, requestId) {
  return useMutation({
    mutationFn: ({ testId, variables = {} }) =>
      runTest(workspaceId, requestId, testId, { variables }),
  });
}

/**
 * Hook to create an assertion inside a test
 */
export function useCreateAssertionMutation(workspaceId, requestId, testId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createAssertion(workspaceId, requestId, testId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tests', workspaceId, requestId],
      });
      queryClient.invalidateQueries({
        queryKey: ['test', workspaceId, requestId, testId],
      });
    },
  });
}

/**
 * Hook to update an assertion definition
 */
export function useUpdateAssertionMutation(workspaceId, requestId, testId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assertionId, ...payload }) =>
      updateAssertion(workspaceId, requestId, testId, assertionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tests', workspaceId, requestId],
      });
      queryClient.invalidateQueries({
        queryKey: ['test', workspaceId, requestId, testId],
      });
    },
  });
}

/**
 * Hook to delete an assertion
 */
export function useDeleteAssertionMutation(workspaceId, requestId, testId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assertionId) =>
      deleteAssertion(workspaceId, requestId, testId, assertionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tests', workspaceId, requestId],
      });
      queryClient.invalidateQueries({
        queryKey: ['test', workspaceId, requestId, testId],
      });
    },
  });
}

export default {
  useApiTestsQuery,
  useApiTestQuery,
  useCreateTestMutation,
  useUpdateTestMutation,
  useDeleteTestMutation,
  useRunTestMutation,
  useCreateAssertionMutation,
  useUpdateAssertionMutation,
  useDeleteAssertionMutation,
};

