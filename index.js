import express from "express";
import DBR from "dynamsoft-node-barcode";
import axios from "axios";

const app = express();

const PORT = process.env.NERU_APP_PORT || 3000;

const ZENDESK_BASE_URL =
  process.env.ZENDESK_BASE_URL || "https://vonage1143.zendesk.com";
const ZENDESK_TOKEN = process.env.ZENDESK_TOKEN || "xxx";
const ZENDESK_USERNAME = process.env.ZENDESK_USERNAME || "email@example.com";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

app.get("/", (req, res) => {
  res.send("OK");
});

app.get("/_/metrics", (req, res) => {
  res.send("OK");
});

app.post("/imgscan", async (req, res) => {
  // get json data from body that AI Studio has posted here
  const { url, number, profileName, channel } = req.body;

  let results;
  try {
    // init barcode reader
    let reader = await DBR.BarcodeReader.createInstance();
    // decode barcode
    results = await reader.decode(`${url}`);
  } catch (e) {
    console.error("Barcode reading error: ", e);
    return res
      .status(500)
      .json({ error: "Barcode reading error: " + e.message });
  }

  // get tasks and also filter them right away
  let tasks;
  try {
    tasks = results
      .filter((r) => isJsonString(r.barcodeText))
      .map((r) => {
        return JSON.parse(r.barcodeText);
      });
  } catch (e) {
    console.error("Task filter error: ", e);
    return res.status(500).json({ error: "Task filter error: " + e.message });
  }

  // only get tasks with the urls we want
  if (tasks.length > 1) {
    tasks = tasks.filter((task) => task.urls.length > 1);
  }
  console.log("tasks: ", tasks);

  // fail request if no tasks detected, so AI Studio could properly respond to the user
  if (tasks.length < 1 || tasks[0].length < 1)
    return res.status(500).json({ error: "Could not recognize image." });

  // prepare axios request data for Zendesk API call
  // please note that you need to have the custom field for Tasks in Zendesk.
  // If you don't have that, just remove the custom_fields section from the request and it will still work.
  const data = JSON.stringify({
    ticket: {
      comment: {
        body: `Kanal: ${channel}\nMobilnummer: ${number}\nRezept Url: ${url}`,
      },
      requester: {
        locale_id: 8,
        name: `${profileName || number}`,
        email: `${number}_nomail@example.org`,
      },
      priority: "urgent",
      subject: "E-Rezept Whatsapp",
      custom_fields: [
        {
          id: 13284676275986,
          value: `${tasks[0].urls.map((t) => {
            return `Task ID: ${t.split("/")[1]}\nAccess Token: ${t
              .split("/")[2]
              .replace("$accept?ac=", "")}\n\n`;
          })}`.replace(",", ""),
        },
      ],
    },
  });

  // preparing Zendesk API Call headers
  var config = {
    method: "POST",
    url: `${ZENDESK_BASE_URL}"/api/v2/tickets"`,
    headers: {
      "Content-Type": "application/json",
    },
    auth: {
      username: `${ZENDESK_USERNAME}/token`,
      password: `${ZENDESK_TOKEN}`,
    },
    data: data,
  };

  // call Zendesk API
  let zendeskData;
  try {
    const response = await axios(config);
    zendeskData = response.data;
    console.log("Zendesk response: ", JSON.stringify(zendeskData));
  } catch (e) {
    console.log("Axios request error: ", e);
  }

  // returning Zendesk ticket info and QR scan results to whoever calls the API (e.g. AI Studio)
  // you could make use of it in AI Studio to tell the user his Zendesk Ticket ID for example
  return res.json({
    foundTasks: tasks,
    zendeskData,
  });
});

// run the server
app.listen(PORT, () => {
  console.log("Server running on http://localhost:", PORT);
});
