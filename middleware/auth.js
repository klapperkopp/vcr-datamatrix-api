import { INTERNAL_API_KEY, ZENDESK_BASE64_AUTH } from "../libs/constants.js";

export const handleStudioAuth = (req, res, next) => {
  /*
    This will check if the API call is autehnticated with either one of the following:
      - A header called "x-api-key" with the value of the environment variable "INTERNAL_API_SECRET"
      - A valid Zendesk API Authentication Header which contains the environment variables ZENDESK_USERNAME and ZENDESK_TOKEN
  */
  if (
    INTERNAL_API_KEY &&
    req.headers &&
    INTERNAL_API_KEY === req.headers["x-api-key"]
  ) {
    next();
  } else if (
    ZENDESK_BASE64_AUTH &&
    req.headers &&
    req.headers["authorization"] &&
    req.headers["authorization"] === ZENDESK_BASE64_AUTH
  ) {
    next();
  } else {
    res.sendStatus(401);
  }
};
