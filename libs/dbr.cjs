import { DYNAMSOFT_LICENSE } from "./constants";

const dbr = require("barcode4nodejs");

if (DYNAMSOFT_LICENSE && DYNAMSOFT_LICENSE.length > 0) {
  dbr.initLicense(DYNAMSOFT_LICENSE);
}

const createReader = async () => {
  return await dbr.BarcodeReader.createInstance();
};

module.exports = { createReader };
