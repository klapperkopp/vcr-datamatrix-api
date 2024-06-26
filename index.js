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
  console.info("Processing Image Url: ", url);

  const imageDownloadResponse = await getImageStream(url);

  // Try to upload the received Whatsapp image to Zendesk
  const response = await uploadAttachmentFromUrl(url, imageDownloadResponse);
  const filename = response?.data?.upload?.attachment?.file_name;

  console.info(`[i] Getting barcode tasks for file ${filename}.`);
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

      console.info(
        `[i] Zendesk ticket creation status: ${ticketResponse.status}`
      );
      console.info(
        "[i] Zendesk ticket ID: ",
        ticketResponse?.data?.ticket?.id || null
      );

      // Return the direct response from Zendesk API without any additions
      return res.status(ticketResponse.status).json(ticketResponse.data);
    } catch (e) {
      handleErrorResponse(e, "Ticket creation error", 400, res);
    }
  }
);

/*
  POST /zendesk/addUserMessageToTicket

  Authentication: Uses authentication header "x-api-key", 
  which must be the value of the secret VCR environment variable "INTERNAL_API_KEY" 
  OR with a valid Zendesk API Authentication.

  Params:
    - message
    - from
    - profileName
    - ticketId
*/
app.post(
  "/zendesk/addUserMessageToTicket",
  handleStudioAuth,
  async (req, res) => {
    try {
      let { message, ticketId, profileName, phone } = req.body;

      if (!message || !phone || !ticketId || !profileName) {
        throw new Error(
          "Please provide a valid phone, message, ticketId, profileName."
        );
      }

      // check if user owns ticket
      const searchUserTickets = await axios.get(
        `${ZENDESK_BASE_URL}/api/v2/search.json?query=type:ticket&phone:${phone}&include=tickets(users)`,
        {
          headers: {
            Authorization: `Basic ${ZENDESK_BASE64_AUTH}`,
            "Content-Type": "application/json",
          },
        }
      );

      // check if the zendesk tickets wuth this users phone number actually contain the ticket number he entered in whatsapp (meaning he owns the ticket)
      let foundUserTicket = searchUserTickets?.data?.results.find(
        (ticket) => ticket.id == ticketId
      );

      // continue if the user owns the ticket id, otherwise return error that can be handled by ai studio response
      if (foundUserTicket) {
        let authorId = foundUserTicket.requester_id;

        // update ticket with user message if it belongs to user
        const updateTicketResponse = await axios.put(
          `${ZENDESK_BASE_URL}/api/v2/tickets/${ticketId}`,
          {
            ticket: {
              comment: {
                body: `${message}`,
                author_id: authorId,
              },
              via: {
                channel: "mobile",
                source: {
                  rel: "mobile",
                  from: { phone, profileName },
                  to: {},
                },
              },
            },
          },
          {
            headers: {
              Authorization: `Basic ${ZENDESK_BASE64_AUTH}`,
              "Content-Type": "application/json",
            },
          }
        );

        return res
          .status(updateTicketResponse.status)
          .json(updateTicketResponse.data);
      } else {
        return res
          .status(401)
          .json({ error: "Ticket does not belong to this user." });
      }
    } catch (e) {
      handleErrorResponse(e, "Ticket creation error", 400, res);
    }
  }
);

/*
  POST /studio/token

  Authentication: Uses authentication header "x-api-key", 
  which must be the value of the secret VCR environment variable "INTERNAL_API_KEY"

  This endpoint will get a JWT from AI Studio. 
  This can be used to send outbound messages through the Vonage 
  Dashboard application that is auto created by AI Studio.
*/
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

/*
  This endpoint can be used to send Outbound Conversations via AI Studio Agents.
  Anyone who answers to the message, would go through the "Outbound" Agent flow defined in the respective agent id.
  Check the docs here: https://studio.docs.ai.vonage.com/whatsapp/get-started/triggering-an-outbound-whatsapp-virtual-agent
*/
app.post("/studio/whatsapp/send", handleStudioAuth, async (req, res) => {
  console.debug("Received request for outbound studio message: ", req.body);
  let { namespace, template, locale, to, components, session_parameters } =
    req.body;

  // we have to clean out all line breaks because Whatsapp tempaltes do not support them.
  let bodyComponent = components.find((c) => c.type.toUpperCase() === "BODY");

  let cleanedParameters = bodyComponent.parameters.map((p) => {
    return { ...p, text: p.text.replace(/\n/g, " ") };
  });

  let otherComponents = components.filter(
    (c) => c.type.toUpperCase() !== "BODY"
  );

  components = [
    ...otherComponents,
    { type: "body", parameters: cleanedParameters },
  ];

  let body = {
    namespace,
    template,
    locale,
    agent_id: AI_STUDIO_AGENT_ID,
    to,
    channel: "whatsapp",
    components,
    session_parameters,
  };

  try {
    const { data } = await axios.post(AI_STUDIO_OUTBOUND_API_URL, body, {
      headers: {
        "X-Vgai-Key": AI_STUDIO_API_KEY,
        "Content-Type": "application/json",
      },
    });
    console.log("Got Studio Outbound API response: ", data);

    return res.json({ success: true, data });
  } catch (e) {
    return handleErrorResponse(e, "Message send error", 400, res);
  }
});

// Run the server
app.listen(PORT, () => {
  console.info(`[i] Server running on: ${APP_URL}`);
  console.info(`[i] Local url: http://localhost:${PORT}`);
});
