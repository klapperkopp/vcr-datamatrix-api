//import DBR from "dynamsoft-node-barcode";
import DBR from "barcode4nodejs";
import { downloadFile } from "./imageHelper.js";
//import { scan } from "qr-scanner-wechat";
//import sharp from "sharp";
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from "@zxing/library";
import pqrs from "pqrs-js";
import { DYNAMSOFT_LICENSE } from "./constants.js";
import {
  getImageBase64
} from "./zendeskHelper.js";
import { dbrParams } from "./dbrConfig.js";

const barcodeTypes = DBR.barcodeTypes;

try {
  if (DYNAMSOFT_LICENSE && DYNAMSOFT_LICENSE.length > 0) {
    //DBR.BarcodeReader.license = DYNAMSOFT_LICENSE;
    DBR.initLicense(DYNAMSOFT_LICENSE);
  }
} catch (e) {
  console.error("Dynamsoft license error: ", e.message);
}

function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
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
      return;
    }

    return { tasks, formattedTasks };
  } catch (e) {
    console.error("Error: ", e.message);
    return;
  }
};

// dynamsoft qr code reader
export const getBarcodeTasksDynamsoft = async (barcodeUrl) => {
  let results;
  try {
    // init barcode reader
    console.log("Init reader...");
    let reader = await DBR.BarcodeReader.createInstance();
    // decode barcode
    console.log("Decoding barcode...");
    results = await reader.decode(`${barcodeUrl}`);
    console.log(results);
  } catch (e) {
    console.error("Barcode reading error: ", e);
    return;
  }

  // get tasks and also filter them right away
  let tasks;
  let formattedTasks = "";
  try {
    tasks = results
      .filter((r) => isJsonString(r.barcodeText))
      .map((r) => {
        return JSON.parse(r.barcodeText);
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
    return;
  }

  return { tasks, formattedTasks };
};

// wechat qr scanner
/*
export const getBarcodeTasksWechatQr = async (barcodeUrl, filename) => {
  const path = `./temp/${filename}`;
  try {
    await downloadFile(barcodeUrl, path)
      .then(async (result) => {
        console.log("Downloaded file: ", result);
        if (result !== true) return;
        //read file
        try {
          //const data = fs.readFileSync(path);
          //console.log(data);

          const image = sharp(path); // or Buffer, anything sharp supports

          const { data, info } = await image
            // .resize(1000) // you can resize first to improve the performance
            .ensureAlpha()
            .raw()
            .toBuffer({
              resolveWithObject: true,
            });

          const result = await scan({
            data: Uint8ClampedArray.from(data),
            width: info.width,
            height: info.height,
          });

          console.log("reader result: ", result);
          return result;
        } catch (e) {
          console.error("File read error: ", e);
          throw e;
        }
      })
      .catch((e) => {
        console.error("Download error: ", e.message);
        throw e;
      });
  } catch (e) {
    console.error("Error: ", e.message);
    return;
  }
};
*/

// zxing
export const getBarcodeTasksZxing = async (barcodeUrl, filename) => {
  const path = `./temp/${filename}`;
  try {
    await downloadFile(barcodeUrl, path)
      .then(async (result) => {
        console.log("Downloaded file: ", result);
        if (result !== true) return;
        //read file
        try {
          //const data = fs.readFileSync(path);
          //console.log(data);

          const image = sharp(path); // or Buffer, anything sharp supports

          const { data, info } = await image
            // .resize(1000) // you can resize first to improve the performance
            .ensureAlpha()
            .raw()
            .toBuffer({
              resolveWithObject: true,
            });

          try {
            const hints = new Map();
            const formats = [BarcodeFormat.DATA_MATRIX];

            hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);

            const reader = new MultiFormatReader();

            const luminanceSource = new RGBLuminanceSource(
              Uint8ClampedArray.from(data),
              info.width,
              info.height
            );
            const binaryBitmap = new BinaryBitmap(
              new HybridBinarizer(luminanceSource)
            );

            const decoded = reader.decode(binaryBitmap, hints);
            console.log("decoded: ", decoded);
          } catch (e) {
            console.error("Barcode read error: ", e);
            return;
          }

          console.log("reader result: ", result);
          return result;
        } catch (e) {
          console.error("File read error: ", e);
          return;
        }
      })
      .catch((e) => {
        console.error("Download error: ", e.message);
        return;
      });
  } catch (e) {
    console.error("Error: ", e.message);
    return;
  }
};

// boof CV + pqrs
export const getBarcodeTasksBoofCV = async (barcodeUrl, filename) => {
  const path = `./temp/${filename}`;
  try {
    await downloadFile(barcodeUrl, path)
      .then(async (result) => {
        console.log("Downloaded file: ", result);
        if (result !== true) return;
        //read file
        try {
          //const data = fs.readFileSync(path);
          //console.log(data);

          const image = sharp(path); // or Buffer, anything sharp supports

          const { data, info } = await image
            // .resize(1000) // you can resize first to improve the performance
            .ensureAlpha()
            .raw()
            .toBuffer({
              resolveWithObject: true,
            });

          try {
            const pqrs_obj = await pqrs({});

            const { width, height } = info;

            const qr = await pqrs_obj.scan_qr({
              data: new Uint8ClampedArray(data.buffer),
              height,
              width,
            });

            console.log("qr codes: ", JSON.stringify(qr));
          } catch (e) {
            console.error("Barcode read error: ", e);
            return;
          }

          console.log("reader result: ", result);
          return result;
        } catch (e) {
          console.error("File read error: ", e);
          return;
        }
      })
      .catch((e) => {
        console.error("Download error: ", e.message);
        return;
      });
  } catch (e) {
    console.error("Error: ", e.message);
    return;
  }
};
