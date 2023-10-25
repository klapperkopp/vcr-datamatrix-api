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
  const { url, number, profileName, channel } = req.body;
  let reader = await DBR.BarcodeReader.createInstance();
  let results = await reader.decode(`${url}`);
  let tasks = results
    .filter((r) => isJsonString(r.barcodeText))
    .map((r) => {
      return JSON.parse(r.barcodeText);
    });
  if (tasks.length > 1) {
    tasks = tasks.filter((task) => task.urls.length > 1);
  }
  console.log(tasks);

  if (tasks.length < 1 || tasks[0].length < 1)
    return res.status(500).json({ error: "Could not recognize image." });
  var data = JSON.stringify({
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

  axios(config)
    .then(function (response) {
      console.log(JSON.stringify(response.data));
    })
    .catch(function (error) {
      console.log(error);
    });

  return res.json({
    tasks,
  });
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:", PORT);
});
