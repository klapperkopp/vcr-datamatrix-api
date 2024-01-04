import mime from "mime";
import { ZENDESK_BASE64_AUTH, ZENDESK_BASE_URL } from "./constants.js";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { downloadFile } from "./imageHelper.js";

export async function getImageStream(url) {
  try {
    const imageDownloadResponse = await axios.get(url, {
      responseType: "stream",
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    console.info("[i] Received image file stream in memory.");
    return imageDownloadResponse;
  } catch (e) {
    console.error("Image download error: ", e.message);
    return null;
  }
}

export async function getImageBase64(url) {
  return await axios
    .get(url, {
      responseType: "arraybuffer",
    })
    .then((response) => {
      return Buffer.from(response.data, "binary").toString("base64");
    })
    .catch((e) => {
      console.error(e.message);
      return;
    });
}

export async function getImageStreamInfo(imageDownloadResponse) {
  try {
    const contentType = imageDownloadResponse.headers["content-type"];
    console.log("contentType: ", contentType);
    const contentLength = imageDownloadResponse.headers["content-length"];
    console.log("contentLength: ", contentLength);
    const filename = `${uuidv4()}.${mime.getExtension(contentType)}`;
    console.log("filename: ", filename);
    return { filename, contentLength, contentType };
  } catch (e) {
    console.error("Error getting image stream info: ", e.message);
    return null;
  }
}

export async function uploadAttachmentFromUrl(
  url,
  imageDownloadResponse = null
) {
  try {
    if (!imageDownloadResponse) {
      imageDownloadResponse = await downloadFile(url);
    }

    const { contentLength, contentType, filename } = await getImageStreamInfo(
      imageDownloadResponse
    );

    console.log("contentType: ", contentType);
    console.log("contentLength: ", contentLength);
    console.log("filename: ", filename);

    const uploadResponse = await axios({
      method: "post",
      url: `${ZENDESK_BASE_URL}/api/v2/uploads.json?filename=${filename}`,
      data: imageDownloadResponse.data,
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
