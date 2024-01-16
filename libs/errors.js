export const handleErrorResponse = (e, message, statusCode, res) => {
  let errorMessage = e?.message ? `${message}: ${e.message}` : `${message}`;
  let errorResponse = e?.response?.data || null;
  console.error(errorMessage);
  console.error(errorResponse);
  return res
    .status(statusCode)
    .json({ success: false, error: errorMessage, errorResponse });
};
