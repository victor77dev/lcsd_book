var fs = require("fs");

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

// Example for decode response
// Sample response from facilityBooking.do
responseString = '//OK[0,18,1,17,23,10,17,1,16,23,10,16,1,14,23,10,14,1,13,15,10,13,1,12,15,10,5,6,53,28,20,18,1,17,23,10,17,1,16,23,10,16,1,14,23,10,14,1,13,15,10,13,1,12,48,10,5,6,52,26,20,18,1,17,23,10,17,1,16,23,10,16,1,14,23,10,14,1,13,15,10,13,1,12,48,10,5,6,51,24,20,18,1,17,23,10,17,1,16,23,10,16,1,14,23,10,14,1,13,15,10,13,1,12,15,10,5,6,50,21,20,4,6,49,18,1,17,11,10,17,1,16,11,10,16,1,14,11,10,14,1,13,15,10,13,1,12,48,10,5,6,0,47,46,7,18,1,17,23,10,17,1,16,23,10,16,1,14,42,10,14,1,13,42,10,13,1,12,23,10,5,6,45,28,20,18,1,17,23,10,17,1,16,23,10,16,1,14,42,10,14,1,13,42,10,13,1,12,23,10,5,6,44,26,20,18,1,17,23,10,17,1,16,23,10,16,1,14,42,10,14,1,13,42,10,13,1,12,23,10,5,6,43,24,20,18,1,17,23,10,17,1,16,23,10,16,1,14,42,10,14,1,13,42,10,13,1,12,23,10,5,6,41,21,20,4,6,40,18,1,17,11,10,17,1,16,11,10,16,1,14,11,10,14,1,13,11,10,13,1,12,11,10,5,6,0,39,38,7,18,1,17,23,10,17,1,16,23,10,16,1,14,15,10,14,1,13,23,10,13,1,12,23,10,5,6,37,36,20,18,1,17,23,10,17,1,16,23,10,16,1,14,15,10,14,1,13,23,10,13,1,12,23,10,5,6,35,34,20,18,1,17,23,10,17,1,16,23,10,16,1,14,15,10,14,1,13,23,10,13,1,12,23,10,5,6,33,32,20,18,1,17,23,10,17,1,16,23,10,16,1,14,15,10,14,1,13,23,10,13,1,12,23,10,5,6,31,30,20,18,1,17,23,10,17,1,16,23,10,16,1,14,15,10,14,1,13,15,10,13,1,12,15,10,5,6,29,28,20,18,1,17,23,10,17,1,16,23,10,16,1,14,15,10,14,1,13,15,10,13,1,12,15,10,5,6,27,26,20,18,1,17,23,10,17,1,16,23,10,16,1,14,15,10,14,1,13,15,10,13,1,12,15,10,5,6,25,24,20,18,1,17,23,10,17,1,16,23,10,16,1,14,15,10,14,1,13,15,10,13,1,12,15,10,5,6,22,21,20,8,6,19,18,1,17,11,10,17,1,16,11,10,16,1,14,15,10,14,1,13,11,10,13,1,12,11,10,5,6,0,9,8,7,3,6,0,5,4,3,0,2,0,1,["hk.gov.lcsd.leisurelink.client.data.item.facilityBooking.SearchFacilityResult/3642383371","20171213","1512872376384","注意：<br/>-你在繁忙時間最多可選擇2個時段，非繁忙時間則最多可選擇4個時段。<br/>-按「查看設施/場地的租訂情況」檢視每個場地各編號球場可供租訂的時段。<br/>-按「隱藏設施/場地的租訂情況」隱藏整個場地可供租訂的時段。(系統會自動編配球場編號)<br/>","[Lhk.gov.lcsd.leisurelink.client.data.item.facilityBooking.VenueNotice;/1648660365","java.util.ArrayList/3821976829","hk.gov.lcsd.leisurelink.client.data.item.facilityBooking.VirtualRoom/1661510947","林士德體育館 - 主場","148","hk.gov.lcsd.leisurelink.client.data.item.facilityBooking.TimeSlotStatus/449591921","&NBSP;","1800","1900","2000","N","2100","2200","2300","23","hk.gov.lcsd.leisurelink.client.data.item.facilityBooking.VirtualCourt/1187450941","設施/ 球場編號 1","268","C","設施/ 球場編號 2","269","設施/ 球場編號 3","270","設施/ 球場編號 4","271","設施/ 球場編號 5","272","設施/ 球場編號 6","273","設施/ 球場編號 7","274","設施/ 球場編號 8","275","北葵涌鄧肇堅體育館 - 主場","125006200","35","120023503","O","120023504","120023505","120023506","長發體育館 - 主場","150","Y","36","280","281","282","283"],0,5]';
decodeResponse(responseString);

// Example for check Captcha1
readCaptcha1("captcha1_data/0.png").then((res) => {
    console.log(res);
  });
