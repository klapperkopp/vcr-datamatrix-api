import express from "express";
import axios from "axios";
import {
  PORT,
  APP_URL,
  ZENDESK_BASE64_AUTH,
  ZENDESK_BASE_URL,
  AI_STUDIO_OUTBOUND_API_URL,
  AI_STUDIO_AGENT_ID,
  AI_STUDIO_API_KEY,
  DEBUG,
} from "./libs/constants.js";
import { handleStudioAuth } from "./middleware/auth.js";
import {
  getImageStream,
  uploadAttachmentFromUrl,
} from "./libs/zendeskHelper.js";
import { getBarcodeTasksDynamsoftNew } from "./libs/barcodeHelper.js";

import { generateStudioJwt } from "./libs/aiStudio.js";
import { handleErrorResponse } from "./libs/errors.js";

// remove logging if debug is off
if (DEBUG != "true") {
  console.log = function () {};
}

// create express application
const app = express();

// mount general middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// BASE WEBSITE
// Mounts the base url just to show that the server is running when you visit it.
app.get("/", (req, res) => {
  res.send("Server is running.");
});

// METRICS AND HEALTH ROUTES
// Mandatory urls for full VCR functionality.
app.get(["/_/metrics", "/_/health"], (req, res) => {
  res.send("OK");
});

// MOUNT API ROUTES

/*
  POST /zendesk/upload

  Authentication: Uses authentication header "x-api-key", 
  which must be the value of the secret VCR environment variable "INTERNAL_API_KEY" 
  OR with a valid Zendesk API Authentication.

  Body Params:
    * url: string
    * description: Contains the url of the image to be uploaded to Zendesk
  
  Returns:
    * json with Zendeks upload token

  Response Examples:
    - 201
      {
        "success": true,
        "token": "zendeskUploadToken"
      }
    - 400
      {
        success: false, 
        error: "Upload error. Try again."
      }
*/
app.post("/zendesk/upload", handleStudioAuth, async (req, res) => {
  const { url } = req.body;
  console.log("url: ", url);

  const imageDownloadResponse = await getImageStream(url);

  // Try to upload the received Whatsapp image to Zendesk
  const response = await uploadAttachmentFromUrl(url, imageDownloadResponse);
  const filename = response?.data?.upload?.attachment?.file_name;

  console.log("getting barcode tasks: ", filename);
  const { tasks, formattedTasks } = await getBarcodeTasksDynamsoftNew(url);

  // Check if the response contains a Zendesk upload token
  let token = response?.data?.upload?.token || null;

  // Return error if no Zendesk upload token found
  if (!token) {
    return handleErrorResponse(null, "Upload error. Try again.", 400, res);
  }

  // Return Zendesk token if it was found
  return res.status(201).json({ success: true, token, tasks, formattedTasks });
});

/*
  POST /zendesk/createTicketWithImage

  Authentication: Uses authentication header "x-api-key", 
  which must be the value of the secret VCR environment variable "INTERNAL_API_KEY" 
  OR with a valid Zendesk API Authentication.

  Params:
    - Uses the format of Zendesk Ticket creation API: https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#create-ticket
*/
app.post(
  "/zendesk/createTicketWithImage",
  handleStudioAuth,
  async (req, res) => {
    try {
      const { ticket } = req.body;
      console.log("Ticket: ", ticket);

      // Check if body has basic Zendesk Ticket format and attached file
      if (!ticket || !ticket?.comment?.uploads[0]) {
        return handleErrorResponse(
          null,
          "Zendesk ticket creation error. Please provide a valid ticket structure.",
          400,
          res
        );
      }

      // Create Zendesk ticket
      const ticketResponse = await axios.post(
        `${ZENDESK_BASE_URL}/api/v2/tickets`,
        {
          ticket,
        },
        {
          headers: {
            Authorization: `Basic ${ZENDESK_BASE64_AUTH}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(
        "Zendesk ticket creation response received: ",
        ticketResponse.data
      );

      // Return the direct response from Zendesk API without any additions
      return res.status(ticketResponse.status).json(ticketResponse.data);
    } catch (e) {
      handleErrorResponse(e, "Ticket creation error", 400, res);
    }
  }
);

app.get("/studio/token", handleStudioAuth, async (req, res) => {
  try {
    const token = await generateStudioJwt();

    if (!token) {
      return res.status(400).json({ success: false, error: "No token found." });
    }

    // return token
    return res.json({ success: true, token });
  } catch (e) {
    handleErrorResponse(e, "Token generation error", 400, res);
  }
});

app.post("/studio/whatsapp/send", handleStudioAuth, async (req, res) => {
  const { namespace, template, locale, to, components } = req.body;

  try {
    const { data } = await axios.post(
      AI_STUDIO_OUTBOUND_API_URL,
      {
        namespace,
        template,
        locale,
        agent_id: AI_STUDIO_AGENT_ID,
        to,
        channel: "whatsapp",
        components,
      },
      {
        headers: {
          "X-Vgai-Key": AI_STUDIO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Got Studio Outbound API response: ", data);

    return res.json({ success: true, data });
  } catch (e) {
    return handleErrorResponse(e, "Message send error", 400, res);
  }
});

// Run the server
app.listen(PORT, () => {
  console.log(`Server running on: ${APP_URL}`);
  console.log(`Local url: http://localhost:${PORT}`);
});
