var request = require("request");
var Cookie = require("request-cookies").Cookie;
var fs = require("fs");
localStorage = require("localStorage");

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

// Decode response from facilityBooking.do
function decodeResponse(responseString) {
  const jsdom = require("jsdom");
  const { JSDOM } = jsdom;

  decodeResponsePath = "decodeResponse.html";
  fs.readFile(decodeResponsePath, (err, data) => {
    if (err) {
      return console.log("readFile Error: " + err);
    }
    const window = new JSDOM(data,{
      runScripts: "dangerously"
    }).window;

    result = window.eval(`v8('` +responseString + `', "")`);
    date = result.b;
    for (i = 0; i < result.g.a.length; i++)
    {
      console.log("date: "+ result.b);
      console.log("location: "+ result.g.a[i].a);
      for (courtNo = 0; courtNo < result.g.a[i].f.a.length; courtNo++)
      {
        console.log("court " + courtNo + ": ");
        court = result.g.a[i].f.a[courtNo];
        for (sessionNo = 0; sessionNo < court.c.a.length; sessionNo++)
        {
          courtStat = court.c.a[sessionNo];
          console.log("time: " + courtStat.b + " to " + courtStat.d + ": " + courtStat.a);
        }
      }
    }
  });
}

// Request index & humanTest
function lcsdRequest(requestUrl, responseFile, requestCookies="") {
  const jsdom = require("jsdom");
  const { JSDOM } = jsdom;
  var response = {};
  response.imgPath = "";
  return new Promise(function(resolve,reject) {
    request({url: requestUrl, headers: {Cookie: requestCookies}}, function(err, res, body) {
      fs.writeFile("temp_" + responseFile, body, function (err) {
        if (err) throw err;
        console.log("temp_" + responseFile + " Saved");
      });

      // edit the response to stop auto form submission
      body = body.replace("document.forms[0].submit();", "document.forms[0];")
      const window = new JSDOM(body,{
        localStorage: localStorage,
        runScripts: "dangerously"
      }).window;
      window.localStorage = localStorage;

      // wait for page to load
      setTimeout(function() {
        var formData = {};
        for (element of window.document.forms[0].children)
          formData[element.name] = element.value;

        requestCookies += window.document.cookie;
        request.post({url: requestUrl, form: formData, headers: {"Cookie": requestCookies}}, function(err, res, body) {
          // parse captcha1 url
          if (body.match(/a=[\d]\.[\d]*/g) != null)
          {
            imgPath = body.match(/a=[\d]\.[\d]*/g)[0];
            response.imgPath = imgPath;
            console.log("imgPath: " + imgPath);
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
      }, 1000);
    });
  });
}

function getCaptcha1(imgPath, outputFile, requestCookies) {
  return new Promise(function(resolve, reject) {
    request({url: "http://w2.leisurelink.lcsd.gov.hk/leisurelink/image?" + imgPath, encoding: 'binary', headers: {Cookie: requestCookies}}, function(err, res, img) {
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
        request.post({url: requestUrl, form: formData, headers: {Cookie: requestCookies}}, function(err, res, body) {
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
      const window = new JSDOM(body,{
        localStorage: localStorage,
        runScripts: "dangerously"
      }).window;
      window.localStorage = localStorage;

      var formData = {};
      for (element of window.document.forms[0].children)
        formData[element.name] = element.value;
      requestUrl = window.document.forms[0].action;
      var winId = window.eval(`winId`);

      requestCookies += window.document.cookie;
      request.post({url: requestUrl, form: formData, headers: {"Cookie": requestCookies}}, function(err, res, body) {
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
          resolve(response);
        });
      });
    });
  });
}

function getPage(requestUrl, responseFile, requestCookies) {
  request({url: requestUrl, headers: {"Cookie": requestCookies}}, function(err, res, body) {
    fs.writeFile(responseFile, body, function (err) {
      if (err) throw err;
      console.log(responseFile + " Saved");
    });
  });
}

function getCourtInfo(responseFile, requestCookies) {
  var requestUrl = "https://t2.leisurelink.lcsd.gov.hk/lcsd/leisurelink/facilityBooking.do";
  formData = "5|0|20|https://t2.leisurelink.lcsd.gov.hk/lcsd/leisurelink/gwt-files/facilityBooking/|1557DA56CD3A6F4FF3AC2AB7A45BA80A|hk.gov.lcsd.leisurelink.client.service.SearchFacilityService|searchFacility|hk.gov.lcsd.leisurelink.client.data.item.facilityBooking.SearchFacilityRequest|Z|hk.gov.lcsd.leisurelink.client.data.item.facilityBooking.SearchFacilityRequest/2775037695|KWT|20180106|7|22|[Ljava.lang.String;/2600011424|148|125006200|150|1514905045159|AM|23|35|36|1|2|3|4|2|5|6|7|8|9|10|11|1|12|3|13|14|15|16|17|12|3|18|19|20|0|";
  request.post({url: requestUrl, body: formData, headers: {"Cookie": requestCookies,
    "Content-Type": "text/x-gwt-rpc; charset=UTF-8",
  }}, function(err, res, body) {
    console.log(body);
    fs.writeFile(responseFile, body, function (err) {
      if (err) throw err;
      console.log(responseFile + " Saved");
    });
  });
}

lcsdRequest("http://w2.leisurelink.lcsd.gov.hk/index/index.jsp?lang=tc", "testing1.html").then((response1) => {
  lcsdRequest("http://w2.leisurelink.lcsd.gov.hk/leisurelink/humanTest/humanTest.jsp?lang=TC", "testing2.html", response1.cookies).then((response2) => {
    submitCaptcha1("testing3.html", response2.imgPath,response1.cookies + response2.cookies)
      .then((response3) => {
        // looks like it is important to make these 3 calls before checking court
        getPage("https://t2.leisurelink.lcsd.gov.hk/lcsd/leisurelink/facilityBooking/login/login.jsp", "testing4.html", response3.cookies);
        getPage("https://t2.leisurelink.lcsd.gov.hk/lcsd/leisurelink/facilityEnquiry/enquiryLogin.do", "testing5.html", response3.cookies);
        getPage("https://t2.leisurelink.lcsd.gov.hk/lcsd/leisurelink/gwt-files/facilityBooking/A95899F762939F6679A16ADB13835234.cache.html", "testing6.html", response3.cookies);
        setTimeout(function() {
          getCourtInfo("testing7.html", response3.cookies);
        }, 5000);
      });
  });
});

// Example for decode response
// Sample response from facilityBooking.do
responseString = '//OK[0,18,1,17,23,10,17,1,16,23,10,16,1,14,23,10,14,1,13,15,10,13,1,12,15,10,5,6,53,28,20,18,1,17,23,10,17,1,16,23,10,16,1,14,23,10,14,1,13,15,10,13,1,12,48,10,5,6,52,26,20,18,1,17,23,10,17,1,16,23,10,16,1,14,23,10,14,1,13,15,10,13,1,12,48,10,5,6,51,24,20,18,1,17,23,10,17,1,16,23,10,16,1,14,23,10,14,1,13,15,10,13,1,12,15,10,5,6,50,21,20,4,6,49,18,1,17,11,10,17,1,16,11,10,16,1,14,11,10,14,1,13,15,10,13,1,12,48,10,5,6,0,47,46,7,18,1,17,23,10,17,1,16,23,10,16,1,14,42,10,14,1,13,42,10,13,1,12,23,10,5,6,45,28,20,18,1,17,23,10,17,1,16,23,10,16,1,14,42,10,14,1,13,42,10,13,1,12,23,10,5,6,44,26,20,18,1,17,23,10,17,1,16,23,10,16,1,14,42,10,14,1,13,42,10,13,1,12,23,10,5,6,43,24,20,18,1,17,23,10,17,1,16,23,10,16,1,14,42,10,14,1,13,42,10,13,1,12,23,10,5,6,41,21,20,4,6,40,18,1,17,11,10,17,1,16,11,10,16,1,14,11,10,14,1,13,11,10,13,1,12,11,10,5,6,0,39,38,7,18,1,17,23,10,17,1,16,23,10,16,1,14,15,10,14,1,13,23,10,13,1,12,23,10,5,6,37,36,20,18,1,17,23,10,17,1,16,23,10,16,1,14,15,10,14,1,13,23,10,13,1,12,23,10,5,6,35,34,20,18,1,17,23,10,17,1,16,23,10,16,1,14,15,10,14,1,13,23,10,13,1,12,23,10,5,6,33,32,20,18,1,17,23,10,17,1,16,23,10,16,1,14,15,10,14,1,13,23,10,13,1,12,23,10,5,6,31,30,20,18,1,17,23,10,17,1,16,23,10,16,1,14,15,10,14,1,13,15,10,13,1,12,15,10,5,6,29,28,20,18,1,17,23,10,17,1,16,23,10,16,1,14,15,10,14,1,13,15,10,13,1,12,15,10,5,6,27,26,20,18,1,17,23,10,17,1,16,23,10,16,1,14,15,10,14,1,13,15,10,13,1,12,15,10,5,6,25,24,20,18,1,17,23,10,17,1,16,23,10,16,1,14,15,10,14,1,13,15,10,13,1,12,15,10,5,6,22,21,20,8,6,19,18,1,17,11,10,17,1,16,11,10,16,1,14,15,10,14,1,13,11,10,13,1,12,11,10,5,6,0,9,8,7,3,6,0,5,4,3,0,2,0,1,["hk.gov.lcsd.leisurelink.client.data.item.facilityBooking.SearchFacilityResult/3642383371","20171213","1512872376384","注意：<br/>-你在繁忙時間最多可選擇2個時段，非繁忙時間則最多可選擇4個時段。<br/>-按「查看設施/場地的租訂情況」檢視每個場地各編號球場可供租訂的時段。<br/>-按「隱藏設施/場地的租訂情況」隱藏整個場地可供租訂的時段。(系統會自動編配球場編號)<br/>","[Lhk.gov.lcsd.leisurelink.client.data.item.facilityBooking.VenueNotice;/1648660365","java.util.ArrayList/3821976829","hk.gov.lcsd.leisurelink.client.data.item.facilityBooking.VirtualRoom/1661510947","林士德體育館 - 主場","148","hk.gov.lcsd.leisurelink.client.data.item.facilityBooking.TimeSlotStatus/449591921","&NBSP;","1800","1900","2000","N","2100","2200","2300","23","hk.gov.lcsd.leisurelink.client.data.item.facilityBooking.VirtualCourt/1187450941","設施/ 球場編號 1","268","C","設施/ 球場編號 2","269","設施/ 球場編號 3","270","設施/ 球場編號 4","271","設施/ 球場編號 5","272","設施/ 球場編號 6","273","設施/ 球場編號 7","274","設施/ 球場編號 8","275","北葵涌鄧肇堅體育館 - 主場","125006200","35","120023503","O","120023504","120023505","120023506","長發體育館 - 主場","150","Y","36","280","281","282","283"],0,5]';
decodeResponse(responseString);

// Example for check Captcha1
readCaptcha1("captcha1_data/0.png").then((res) => {
    console.log(res);
  });
