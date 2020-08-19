require('electron-titlebar');
var rp = require('request-promise');
var request = require('request');
const { ipcRenderer } = require('electron');
var helpers = require('../model/helpers');
var log_uploader = require('../model/log-uploader.js')
const fs = require('fs'),
  path = require('path'),
  _ = require('underscore');

const dps_report_endpoint = "https://dps.report/";
const encounters = require('../resources/encounters.json');

// set style from settings
try{
  var settings = JSON.parse(fs.readFileSync('./resources/settings.json', 'utf8'));
} catch (err)
{
  console.log(err);
}

ipcRenderer.on('set-upload-style', (event, arg) => {
  helpers.setStyle(arg);
});

// used for attempting retries on 500 errors found when uploading to dps.report
let retry_counter = 0;
let MAX_RETRIES = 3;

// helper sleep function to wait the thread
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function updateProgressBar(count, total_to_upload)
{
  console.log(count)
  console.log(total_to_upload);
  // update the html
  let completion = Math.round(count/total_to_upload * 100);
  $("#progress-label").html(`${count}/${total_to_upload}`);
  document.getElementById("progress-inner-bar").style.width =`${completion}%`;
  document.getElementById("progress-inner-bar").setAttribute("aria-valuenow", `${completion}`);
}

async function uploadNewBossLogs(_dir, _user_token, _min_time) {
  let logs_to_upload = log_uploader.getNewBossLogs(_dir, _min_time);

  let total_to_upload = logs_to_upload.length;
  let count = 0;
  updateProgressBar(count, total_to_upload);
  for (log of logs_to_upload) {
    await log_uploader.uploadNewBossLog(log, _user_token);
    count++;
    updateProgressBar(count, total_to_upload);
    //send something here to let table know to refresh
  }
  document.getElementById("custom-title").innerHTML = "Done";
}

// only upload the last month for my sanity
var d = new Date();
d.setMonth(d.getMonth() - 1);
d.setHours(0, 0, 0);
d.setMilliseconds(0);

// lift off as soon as the button is clicked.
uploadNewBossLogs(settings.path, settings.apiKey, d);