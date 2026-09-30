export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return 'The request timed out. Please try again.';
    }
    return 'Unable to reach MediAI. Check your connection and try again.';
  }

  const { status, data } = error.response;

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors
      .map((issue) => issue.message)
      .filter(Boolean)
      .join('. ');
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  switch (status) {
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You are not authorized to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This conflicts with an existing record.';
    case 422:
      return 'Please review the form and correct any invalid fields.';
    case 500:
      return 'A server error occurred. Please try again shortly.';
    default:
      return fallback;
  }
}

export function getFieldErrors(error) {
  const issues = error?.response?.data?.errors;
  if (!Array.isArray(issues)) return {};

  return issues.reduce((acc, issue) => {
    const field = String(issue.field || '')
      .replace(/^body\./, '')
      .replace(/^query\./, '');
    if (field) acc[field] = issue.message;
    return acc;
  }, {});
}
