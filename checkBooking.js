// Find Captcha1
function readCaptcha1(imgPath) {
  return new Promise(function(resolve,reject) {
    var spawn = require("child_process").spawn;
    var process = spawn("python", ["captcha1.py", imgPath]);

    process.stdout.on("data", (data) => {
      output = data.toString().replace("\n", "");
      resolve(output);
    });
    process.stderr.on("data", (data) => {
      console.log("Error: " + data.toString());
    });
    process.on("close", (code) => {
      console.log("Read captcha end");
    });
  });
}

// Example for check Captcha1
readCaptcha1("captcha1_data/0.png").then((res) => {
    console.log(res);
  });
