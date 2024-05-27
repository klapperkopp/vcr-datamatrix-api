export const handleErrorResponse = (e, message, statusCode, res) => {
  let errorMessage = e?.message ? `${message}: ${e.message}` : `${message}`;
  let errorResponse = e?.response?.data || null;
  let errorDetails = e?.response?.data?.details
    ? JSON.stringify(e?.response?.data?.details)
    : null;
  console.error(errorMessage);
  console.error(errorResponse);
  console.error(errorDetails);
  return res
    .status(statusCode)
    .json({ success: false, error: errorMessage, errorResponse });
};
