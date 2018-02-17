var request = require("request");
var Cookie = require("request-cookies").Cookie;
var fs = require("fs");

var limitPool = {maxSockets: 10}
var limitRequest = request.defaults({
  pool: limitPool,
  timeout: 10000,
})

const getCookiesRetryTime = 5000; // 5s
const randomRequestTime = 10000; // 10s

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
      // output "error"
      resolve("error");
    });
    process.on("close", (code) => {
      console.log("Read captcha end");
    });
  });
}
exports.readCaptcha1 = readCaptcha1;

// Decode response from facilityBooking.do
function decodeResponse(responseString, allData={}) {
  const jsdom = require("jsdom");
  const { JSDOM } = jsdom;

  return new Promise(function(resolve, reject) {
    decodeResponsePath = "decodeResponse.html";
    fs.readFile(decodeResponsePath, (err, data) => {
      if (err) {
        return console.log("readFile Error: " + err);
      }
      var window = new JSDOM(data,{
        runScripts: "dangerously"
      }).window;

      responseString = JSON.stringify(responseString);
      result = window.eval(`v8(` + responseString + `, "")`);

      // date = result.b;
      for (i = 0; i < result.g.a.length; i++) {
        var location = result.g.a[i].a;
        var courtData = allData[location] || {};
        courtData.location = location;
        courtData.courts = courtData.courts || {};
        for (courtNo = 0; courtNo < result.g.a[i].f.a.length; courtNo++) {
          court = result.g.a[i].f.a[courtNo];
          courtData.courts[courtNo] = courtData.courts[courtNo] || {};
          for (sessionNo = 0; sessionNo < court.c.a.length; sessionNo++) {
            courtStat = court.c.a[sessionNo];
            // start_time = courtStat.b; end_time = courtStat.d; court_status = courtStat.a);
            courtData.courts[courtNo][courtStat.b + "-" + courtStat.d] = courtStat.a;
          }
        }
        allData[location] = courtData;
      }
      resolve(allData);
    });
  });
}
exports.decodeResponse = decodeResponse;

// Request index & humanTest
function lcsdRequest(requestUrl, responseFile, requestCookies="") {
  console.log("lcsdRequest requestCookies:" + requestCookies);
  const jsdom = require("jsdom");
  const { JSDOM } = jsdom;
  var response = {};
  response.imgPath = "";
  return new Promise(function(resolve,reject) {
    request({url: requestUrl, headers: {Cookie: requestCookies}}, function(err, res, body) {
      if (err) throw err;
      fs.writeFile("temp_" + responseFile, body, function (err) {
        if (err) throw err;
        console.log("temp_" + responseFile + " Saved");
      });

      // edit the response to stop auto form submission
      body = body.replace("document.forms[0].submit();", "document.forms[0];")
      var window = new JSDOM(body,{
        localStorage: localStorage,
        runScripts: "dangerously"
      }).window;
      var localStorage = require("localStorage");
      window.localStorage = localStorage;

      // wait for page to load
      var loading = setInterval(function() {
        var formData = {};
        for (element of window.document.forms[0].children)
          formData[element.name] = element.value;
        if (formData != {})
        {
          console.log(responseFile + " created form:" + formData);
          clearInterval(loading);
          requestCookies += window.document.cookie;
          limitRequest.post({url: requestUrl, form: formData, headers: {"Cookie": requestCookies}}, function(err, res, body) {
            if (err) throw err;
            // parse captcha1 url
            if (body.match(/a=[\d]\.[\d]*/g) != null)
            {
              imgPath = body.match(/a=[\d]\.[\d]*/g)[0];
              response.imgPath = imgPath;
              console.log("imgPath: " + imgPath);
            }
            else {
              if (responseFile == "testing2.html")
                console.log("cannot find imgPath. body:" + body);
            }

            responseCookies = "";
            rawCookies = res.headers['set-cookie'];
            for (var i in rawCookies) {
              var cookie = new Cookie(rawCookies[i]);
              responseCookies += cookie.key + "=" + cookie.value + "; ";
            }
            fs.writeFile(responseFile, body, function (err) {
              if (err) throw err;
              console.log(responseFile + " Saved");
              response.cookies = responseCookies;
              resolve(response);
            });
          });
        }
        else
          console.log(responseFile + " form is empty");
      }, 1000);
    });
  });
}

function getCaptcha1(imgPath, outputFile, requestCookies) {
  return new Promise(function(resolve, reject) {
    request({url: "http://w2.leisurelink.lcsd.gov.hk/leisurelink/image?" + imgPath, encoding: 'binary', headers: {Cookie: requestCookies}}, function(err, res, img) {
      if (err) throw err;
      fs.writeFile(outputFile, img, 'binary', function (err) {
        if (err) throw err;
        console.log(outputFile + " Saved");
        resolve(outputFile);
      });
    });
  });
}

// Mutiple retries submission captcha1 (captcha1 image saved in debug folder)
function retrySubmitCaptcha1(responseFile, imgPath, requestCookies, maxRetry) {
  captchaInput = "debug/testImg" + maxRetry + ".png";
  return new Promise(function(resolve, reject) {
    getCaptcha1(imgPath, captchaInput, requestCookies)
      .then((captchaInput) => {
      readCaptcha1(captchaInput).then((data) => {
        console.log(captchaInput + ":" + data.toString());

        var formData = {};
        formData["imgCode"] = data.toString().replace("\n","");
        formData["check"] = true;

        requestUrl = "http://w2.leisurelink.lcsd.gov.hk/leisurelink/application/checkCode.do";
        limitRequest.post({url: requestUrl, form: formData, headers: {Cookie: requestCookies}}, function(err, res, body) {
          if (err) throw err;
          fs.writeFile("temp_" + responseFile, body, function (err) {
            if (err) throw err;
            console.log("temp_" + responseFile + " Saved");
          });
          if (body.search("forwardForm") == -1)
          {
            if (maxRetry > 0) {
              console.log("Incorrect captcha1");
              resolve(retrySubmitCaptcha1(responseFile, imgPath, requestCookies, maxRetry - 1));
            }
            else {
              reject("Max retries!! incorrect captcha1");
            }
          }
          else
          {
            console.log("Captcha1 success");
            rawCookies = res.headers['set-cookie'];
            for (var i in rawCookies) {
              var cookie = new Cookie(rawCookies[i]);
              responseCookies += cookie.key + "=" + cookie.value + "; ";
            }
            var response = {};
            response.cookies = responseCookies;
            response.body = body;
            resolve(response);
          }
        });
      });
    });
  });
}

// submit captcha1 in checkCode.do
function submitCaptcha1(responseFile, imgPath, requestCookies) {
  const jsdom = require("jsdom");
  const { JSDOM } = jsdom;

  return new Promise(function(resolve, reject) {
    retrySubmitCaptcha1(responseFile, imgPath, requestCookies, 15)
    .then((response) => {
      // edit the response to stop auto form submission
      body = response.body.replace("document.getElementById(\"forwardForm\").submit();", "document.getElementById(\"forwardForm\");");
      var window = new JSDOM(body,{
        localStorage: localStorage,
        runScripts: "dangerously"
      }).window;
      var localStorage = require("localStorage");
      window.localStorage = localStorage;

      var formData = {};
      for (element of window.document.forms[0].children)
        formData[element.name] = element.value;
      requestUrl = window.document.forms[0].action;
      var winId = window.eval(`winId`);

      requestCookies += window.document.cookie;
      limitRequest.post({url: requestUrl, form: formData, headers: {"Cookie": requestCookies}}, function(err, res, body) {
        if (err) throw err;
        responseCookies = "";
        responseCookies += "winId=" + winId + "; ";
        rawCookies = res.headers['set-cookie'];
        for (var i in rawCookies) {
          var cookie = new Cookie(rawCookies[i]);
          responseCookies += cookie.key + "=" + cookie.value + "; ";
        }

        fs.writeFile(responseFile, body, function (err) {
          if (err) throw err;
          console.log(responseFile + " Saved");
          var response = {};
          response.cookies = responseCookies;
          console.log("Cookies: " + response.cookies);
          resolve(response);
        });
      });
    })
    .catch((err)=>{
      reject(err);
    });
  });
}

// group the get and submit captcha1 to get the correct cookies for 10min checking token
function getCookies(maxRetry) {
  return new Promise(function(resolve, reject) {
    lcsdRequest("http://w2.leisurelink.lcsd.gov.hk/index/index.jsp?lang=tc", "testing1.html").then((response1) => {
      lcsdRequest("http://w2.leisurelink.lcsd.gov.hk/leisurelink/humanTest/humanTest.jsp?lang=TC", "testing2.html", response1.cookies).then((response2) => {
        submitCaptcha1("testing3.html", response2.imgPath,response1.cookies + response2.cookies)
        .then((response3) => {
          resolve(response3);
        })
        .catch((err)=> {
          console.log(err + "\nRetry to get cookies");
          if (maxRetry > 0)
          {
            setTimeout(function() {
              resolve(getCookies(maxRetry - 1));
            }, getCookiesRetryTime);
          }
          else
            reject("getCookies reaches Max retry");
        });
      });
    });
  });
}

// download the pages after getting token
function getPage(requestUrl, responseFile, requestCookies) {
  return new Promise(function(resolve, reject) {
    request({url: requestUrl, headers: {"Cookie": requestCookies}}, function(err, res, body) {
      if (err) throw err;
      fs.writeFile(responseFile, body, function (err) {
        if (err) throw err;
        console.log(responseFile + " Saved");
        resolve();
      });
    });
  });
}

// send calls before really sending check court info
function getBasicPages(response) {
  return new Promise(function(resolve, reject) {
    // looks like it is important to make these 3 calls before checking court
    getPage("https://t2.leisurelink.lcsd.gov.hk/lcsd/leisurelink/facilityBooking/login/login.jsp", "testing4.html", response.cookies)
    .then(() => {
      getPage("https://t2.leisurelink.lcsd.gov.hk/lcsd/leisurelink/facilityEnquiry/enquiryLogin.do", "testing5.html", response.cookies)
    .then(() => {
      getPage("https://t2.leisurelink.lcsd.gov.hk/lcsd/leisurelink/gwt-files/facilityBooking/A95899F762939F6679A16ADB13835234.cache.html", "testing6.html", response.cookies)
    .then(() => {
      resolve(response);
    });
    });
    });
  });
}

// send check court request
function getCourtInfo(responseFile, formData, date, requestCookies, maxRetry) {
  var requestUrl = "https://t2.leisurelink.lcsd.gov.hk/lcsd/leisurelink/facilityBooking.do";
  return new Promise(function(resolve, reject) {
    console.log("send " + responseFile);
    limitRequest.post({url: requestUrl, body: formData, headers: {"Cookie": requestCookies,
      "Content-Type": "text/x-gwt-rpc; charset=UTF-8",
    }}, function(err, res, body) {
      if (err) throw err;
      fs.writeFile("debug/" + responseFile + "_" + date, body, function (err) {
        if (err) throw err;
        if (body.search("//OK") == -1) {
          if (maxRetry > 0) {
              resolve(getCourtInfo(responseFile, formData, date, requestCookies, maxRetry - 1));
          }
          else
            reject(responseFile + "_" + date + ": Max retry");
        }
        else {
          console.log("debug/" + responseFile + "_" + date + " Saved");
          resolve(body);
        }
      });
    });
  });
}

// create summary for all resposnes
function summarizeCourtData(outputFile, allData) {
  var summary = {};
  var timeList = [];
  var courtList = {};
  return new Promise(function(resolve, reject) {
    for (var key in allData) {
      var currentTimeList = Object.keys(allData[key]["courts"][0]);
      for (var time in currentTimeList) {
        if (timeList.indexOf(currentTimeList[time]) == -1)
          timeList.push(currentTimeList[time]);
      }
    }
    timeList = timeList.sort();
    summary.time = timeList;
    for (var key in allData) {
      var courtCount = [];
      for (var index in timeList) {
        var time = timeList[index];
        var count = 0;
        for (var courtNo in allData[key]["courts"]) {
          var court = allData[key]["courts"][courtNo];
          if(court[time] == "Y")
            count++;
        }
        courtCount.push(count);
      }
      summary[key] = courtCount;
    }
    fs.writeFile(outputFile, JSON.stringify(summary), function(err) {
      if (err) throw err;
      console.log(outputFile + " Saved");
      resolve(summary);
    });
  });
}

// sends all checking requests
function checkBooking(response) {
  console.log("check courts");
  return new Promise(function(checkResolve, checkReject) {
    var summarizeAll = [];
    var allSummary = {};

    fs.readFile("requestCourtList.json", (err, data) => {
      if (err) {
        return console.log("Read requestCourtList Error: " + err);
      }
      for (var i = 0; i < 10; i++) {
        (function() {
          var d = new Date();
          d.setDate(d.getDate() + i);
          var date = "";
          date += d.getFullYear();
          date += d.getMonth() + 1 < 10 ? "0" + (d.getMonth() + 1): d.getDate + 1;
          date += d.getDate() < 10 ? "0" + d.getDate(): d.getDate();
          var readFilePromise = new Promise(function(fileResolve, fileReject) {
            fs.readFile("debug/rawCourtData" + date, (err, allData)=> {
              if (err)
                allData = "{}";
              if (allData.toString() == "")
                allData = "{}";
              allData = JSON.parse(allData);

              var requestList = JSON.parse(data);
              var decodeAll = [];
              function getResponseAndDecode(date, time, key, request, decodeAll) {
                var formData = request.replace("date", date).replace("AM", time);
                var getResponse = new Promise(function(resolve, reject) {
                  setTimeout(() => {
                    getCourtInfo(key + "_" + time, formData, date,  response.cookies, 5).then((responseString)=> {
                      console.log(key + "_" + time + ": decoding");
                      decodeResponse(responseString, allData, date).then(()=>{
                        resolve("decoded");
                      });
                    })
                    .catch((err) => {
                      reject(err);
                    });
                  }, Math.random() * randomRequestTime % randomRequestTime);
                });
                return decodeAll.push(getResponse);
              }
              for (var key in requestList) {
                var timeRequestList = ["AM", "PM", "EV"];
                for (var time in timeRequestList) {
                  console.log("key: " + key + " time: " + time);
                  getResponseAndDecode(date, timeRequestList[time], key, requestList[key], decodeAll);
                }
              }
              Promise.all(decodeAll).then(() => {
                fs.writeFile("debug/rawCourtData" + date, JSON.stringify(allData), function (err) {
                  if (err) throw err;
                  console.log("debug/rawCourtData" + date + " Saved");
                });
                var summaryResponse = new Promise(function(resolve, reject) {
                  summarizeCourtData("debug/courtData" + date, allData)
                  .then((summary) => {
                    allSummary[date] = summary;
                    resolve("summarized");
                    fileResolve("read file");
                  });
                });
              });
            });
          });
          summarizeAll.push(readFilePromise);
        })();
      }
      Promise.all(summarizeAll).then(() => {
        checkResolve(allSummary);
      });
    });
  });
}

function readAllLastSummary() {
  var summarizeAll = [];
  var allSummary = {};
  for (var i = 0; i < 10; i++) {
    (function() {
      var d = new Date();
      d.setDate(d.getDate() + i);
      var date = "";
      date += d.getFullYear();
      date += d.getMonth() + 1 < 10 ? "0" + (d.getMonth() + 1): d.getDate + 1;
      date += d.getDate() < 10 ? "0" + d.getDate(): d.getDate();
      var summaryRead = new Promise(function(resolve, reject) {
        fs.readFile("debug/courtData" + date, (err, data)=> {
          if (err) {
            console.log("Fail to read debug/courtData" + date);
            resolve(date);
          }
          else {
            var summary = JSON.parse(data);
            allSummary[date] = summary;
            resolve(date);
          }
        });
      });
      summarizeAll.push(summaryRead);
    })();
  }
  return new Promise(function(readResolve, readReject) {
    Promise.all(summarizeAll).then(() => {
      readResolve(allSummary);
    })
    .catch(() => {
      console.log("fail allSummary");
      readResolve(allSummary);
    });
  });
}
exports.readAllLastSummary = readAllLastSummary;

function readLastSummary(date) {
  return new Promise(function(resolve, reject) {
    fs.readFile("debug/courtData" + date, (err, data)=> {
      if (err) {
        console.log("Fail to read debug/courtData" + date);
        reject("Fail to read debug/courtData" + date);
      }
      else {
        var summary = {};
        summary[date] = JSON.parse(data);
        resolve(summary);
      }
    });
  });
}
exports.readLastSummary = readLastSummary;

// initialize of checking and try if the cookies is working
function initChecking(maxRetry) {
  return new Promise(function(resolve, reject) {
    getCookies(3).then((response) => {
      getBasicPages(response)
      .then((response) => {
        fs.readFile("requestCourtList.json", (err, data) => {
          if (err) {
            return console.log("Read requestCourtList Error: " + err);
          }

          var d = new Date();
          var date = "";
          date += d.getFullYear();
          date += d.getMonth() + 1 < 10 ? "0" + (d.getMonth() + 1): d.getDate + 1;
          date += d.getDate() < 10 ? "0" + d.getDate(): d.getDate();

          var requestList = JSON.parse(data);
          var key = Object.keys(requestList)[0];
          var formData = requestList[key].replace("date", date);
          getCourtInfo(key, formData, date,  response.cookies, 3)
          .then((data) => {
            resolve(response);
          })
          .catch((err) => {
            if (maxRetry > 0) {
              console.log("initChecking Retry: getCourtInfo Error:" + err);
              setTimeout(function() {
                resolve(initChecking(maxRetry - 1));
              }, getCookiesRetryTime);
            }
            else
              reject(err);
          })
        });
      });
    })
    .catch((err) => {
      if (maxRetry > 0) {
        console.log("initChecking Retry: getCookies Error:" + err);
        setTimeout(function() {
          resolve(initChecking(maxRetry - 1));
        }, getCookiesRetryTime);
      }
      else
        reject(err);
    });
  });
}

function updateCourtInfo() {
  initChecking(5).then((response) => {
    checkBooking(response).then((summary) => {
      var date = new Date();
      summary["latest_update"] = date;
      console.log(summary);
    });
  });
}
exports.updateCourtInfo = updateCourtInfo;
