import mime from "mime";
import { ZENDESK_BASE64_AUTH, ZENDESK_BASE_URL } from "./constants.js";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

export async function uploadAttachmentFromUrl(url) {
  try {
    const response = await axios.get(url, {
      responseType: "stream",
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    console.info("[i] Received image file stream in memory.");

    const contentType = response.headers["content-type"];
    console.log("contentType: ", contentType);
    const contentLength = response.headers["content-length"];
    console.log("contentLength: ", contentLength);
    const filename = `${uuidv4()}.${mime.getExtension(contentType)}`;
    console.log("filename: ", filename);

    const uploadResponse = await axios({
      method: "post",
      url: `${ZENDESK_BASE_URL}/api/v2/uploads.json?filename=${filename}`,
      data: response.data,
      headers: {
        "Content-Type": `${contentType}`,
        Authorization: `Basic ${ZENDESK_BASE64_AUTH}`,
      },
    });

    console.log("Zendesk Upload Response: ", uploadResponse.data);
    return uploadResponse;
  } catch (error) {
    let message = `Failed to upload attachment to Zendesk: ${error.message}`;
    console.error(message);
    return { success: false, error: message };
  }
}
