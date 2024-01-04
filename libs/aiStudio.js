import axios from "axios";
import {
  AI_STUDIO_AGENT_ID,
  AI_STUDIO_AUTH_URL,
  AI_STUDIO_API_KEY,
} from "./constants.js";

export const generateStudioJwt = async () => {
  try {
    // get agent information including jwt token from studio api
    const { data } = await axios.get(
      `${AI_STUDIO_AUTH_URL}/agents/${AI_STUDIO_AGENT_ID}`,
      {
        headers: {
          "X-Vgai-Key": `${AI_STUDIO_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    //trying to get JWT token for studio api call
    const { token } = data;

    // return token
    return token;
  } catch (e) {
    console.error("generateStudioJwt error:");
    console.error({
      message: e.message,
      status: e.response.status,
    });
    return;
  }
};
