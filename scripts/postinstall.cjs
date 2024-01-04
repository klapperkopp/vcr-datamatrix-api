var exec = require("child_process").exec;
var os = require("os");

function puts(error, stdout, stderr) {
  console.error(error);
}

const commands_linux = [
  "npm install --cpu=x64 --os=linux sharp",
  "npm install --cpu=x64 --os=linux --libc=musl sharp",
];

const commands_darwin = [
  "npm install --cpu=x64 --os=darwin sharp",
  "npm install --cpu=arm64 --os=darwin sharp",
];

const commands_windows = [];

// Run command depending on the OS
if (os.type() === "Linux") {
  if (commands_linux.length > 0) exec(commands_linux.join("&&"), puts);
} else if (os.type() === "Darwin") {
  if (commands_darwin.length > 0) exec(commands_darwin.join("&&"), puts);
} else if (os.type() === "Windows_NT") {
  if (commands_windows.length > 0) exec(commands_windows.join("&&"), puts);
}
