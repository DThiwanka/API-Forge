export const assertionService = {
  check(assertion, response) {
    const { type, value } = assertion;
    switch (type) {
      case 'STATUS_CODE':
        return response.status === Number(value);
      case 'RESPONSE_TIME':
        return response.time < Number(value);
      case 'BODY_CONTAINS':
        return JSON.stringify(response.data || '').includes(String(value));
      default:
        return true;
    }
  },
};

export default assertionService;
