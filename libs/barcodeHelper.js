import DBR from "barcode4nodejs";
import { DYNAMSOFT_LICENSE } from "./constants.js";
import { getImageBase64 } from "./zendeskHelper.js";
import { dbrParams } from "./dbrConfig.js";

try {
  if (DYNAMSOFT_LICENSE && DYNAMSOFT_LICENSE.length > 0) {
    //DBR.BarcodeReader.license = DYNAMSOFT_LICENSE;
    DBR.initLicense(DYNAMSOFT_LICENSE);
  }
} catch (e) {
  console.error("Dynamsoft license error: ", e.message);
}

// dynamsoft qr code reader
export const getBarcodeTasksDynamsoftNew = async (barcodeUrl) => {
  try {
    const template = JSON.stringify(dbrParams);

    const imgBase64 = await getImageBase64(barcodeUrl);
    const results = await DBR.decodeBase64Async(
      imgBase64,
      DBR.formats.DataMatrix,
      template
    );

    console.log("results: ", results);

    // get tasks and also filter them right away
    let tasks;
    let formattedTasks = "";
    try {
      tasks = results.map((r) => {
        return JSON.parse(r.value);
      });

      // only get tasks with the urls we want
      if (tasks.length > 1) {
        tasks = tasks.filter((task) => task.urls.length > 1);
      }

      console.log("tasks: ", tasks);

      for await (let t of tasks[0].urls) {
        formattedTasks += t + "\\n";
      }

      console.log("formattedTasks: ", formattedTasks);
    } catch (e) {
      console.error("Task filter error: ", e);
      return { tasks: [], formattedTasks: "" };
    }

    return { tasks, formattedTasks };
  } catch (e) {
    console.error("Error: ", e.message);
    return { tasks: [], formattedTasks: "" };
  }
};
