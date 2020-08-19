var rp = require('request-promise');
var request = require('request');
const fs = require('fs'),
  path = require('path'),
  _ = require('underscore');
const moveFile = require('move-file');
const { ipcRenderer } = require('electron');

const dps_report_endpoint = "https://dps.report/";
const base_dir = "C:\\Users\\Rohan\\Documents\\Guild Wars 2\\addons\\arcdps\\arcdps.cbtlogs\\";
const encounters = require('../resources/encounters.json');
let retry_counter = 0;
let MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// look up in the encounter json to find the boss/encounter name given an id
function getBossNameFromID(targetId) {
  let matching_encounter;

  let match = Object.values(encounters[0].bosses).filter(boss_data => boss_data === targetId)

  matching_encounter = encounters.filter(data => Object.values(data.bosses).filter(boss_data => boss_data === targetId).length > 0);
  if (matching_encounter.length === 1) {
    return matching_encounter[0].name;
  }
  // console.log("Encounter could not be found or has more than 1 result " + targetId);
  return "Unknown";
}

// !!WARNING!!
// The output of this function is unique to you. Anyone with this token can access any previous logs you upload.
async function getUserToken() {
  let options = {
    uri: dps_report_endpoint + "getUserToken",
    json: true, // Automatically parses the JSON string in the response
  };
  let res = await rp(options).catch(err => {
    console.log(err);
    return null;
  });
  return res;
}

async function uploadLog(log, token) {
  let allowedFileTypes = ["evtc", "zevtc", "zip"];
  let type_match = log.name.match(/(?<=.)[0-9a-z]+$/);
  if (type_match.length === 0) {
    console.log("No file type given.");
    return null;
  }
  if (allowedFileTypes.indexOf(type_match[type_match.length - 1]) === -1) {
    console.log("Wrong file type.");
    return null;
  }

  let type = type_match[type_match.length - 1];

  //console.log(dps_report_endpoint + `uploadContent?json=1`);
  //console.log(location);
  let fileStream = fs.createReadStream(log.path);
  let options = {
    method: 'POST',
    uri: dps_report_endpoint + `uploadContent?json=1`,
    json: true, // Automatically parses the JSON string in the response
    formData: {
      file: {
        value: fileStream,
        options: {
          filename: `log.${type}`,
          contentType: type
        }
      }
    }
  };
  try {
    var res = await rp(options);
    return res.permalink;
  } catch (err) {
    console.log(err);
    if ((err.statusCode >= 500 && err.statusCode < 600 && retry_counter !== MAX_RETRIES)) {
      console.log("Retrying.");
      retry_counter++; // only retry if it's a server error.
      sleep(1000); // sleep thread 1 sec
      return await uploadLog(log, name, token);
    } else if (err.statusCode === 403 && err.message.indexOf("too short") > -1) {
      // black list this file. It should never be uploaded.
      // async here since we won't hit the file again so it doesn't matter when it gets added to the blacklist.
      fs.appendFile('./resources/blacklist.txt', log.name + '\n', (err) => {
        if (err) console.log(err);
      });
      return null;
    } else {
      return null
    }
  };
}

async function getLogJSON(url) {
  let options =
  {
    uri: `${dps_report_endpoint}getJson?permalink=${url}`,
    json: true // Automatically parses the JSON string in the response
  }
  try {
    retry_counter = 0;
    var res = await rp(options);
    return res;
  } catch (err) {
    console.log(err);
    if (err.statusCode >= 500 && err.statusCode < 600 && retry_counter !== MAX_RETRIES) {
      retry_counter++;
      sleep(1000); // sleep thread 1 sec
      return await getLogJSON(url);
    } else {
      retry_counter = 0;
      return null;
    }
  }
}

function getLogFileJSON(_dir) {
  try {
    return JSON.parse(fs.readFileSync('./resources/' + _dir, 'utf8'));
  } catch (err) {
    if (err.code === "ENOENT") {
      return {};
    } else {
      throw err;
    }
  }
}

// recursively travels down a directory. Note this does not care about type.
// Type is filtered when attempting to upload. This is done to make sure people are aware
// how much needs to be scraped and don't just put C:/ as their base directory.
function getFilesInDir(_dir, blacklistedFiles = null) {
  try {
    if (blacklistedFiles === null) {
      blacklistedFiles = fs.readFileSync('./resources/blacklist.txt', 'utf8').split('\n');
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      blacklistedFiles = [];
    } else {
      throw err;
    }
  }


  let files = [];
  try {
    files = fs.readdirSync(_dir);
  } catch (err) {
    return null;
  }

  var files_data = [];

  for (file of files) {
    var fullpath = path.join(_dir, file);
    let stats = fs.statSync(fullpath);

    if (stats.isDirectory()) {
      let files_to_concat = getFilesInDir(fullpath, blacklistedFiles);
      files_data = files_data.concat(files_to_concat);
    } else {
      if (blacklistedFiles.indexOf(file) > -1) {
        // Blacklisted file. Do not attempt to upload.
        continue;
      } else {
        let file_data = {
          "birthtime": stats.birthtime,
          "name": file,
          "path": fullpath
        }
        files_data.push(file_data);
      }
    }
  }
  return files_data;
}

/* Sort the files found in the above method. There is no real reason to do this other than
having a bit of linearity in the log file */
function getDateSortedFileList(_dir) {
  var sorted_file_stats = [];
  let files = getFilesInDir(_dir);
  if (files == null) {
    console.log("Error occured when reading file in " + _dir);
    return null;
  }

  for (file_stats of files) {
    // [1, 2.5, 3, 4, 5]    2
    let was_inserted = false;
    let j = sorted_file_stats.length - 1;
    for (; j >= 0; j--) {
      if (sorted_file_stats[j].birthtime < file_stats.birthtime) {
        sorted_file_stats.splice(j + 1, 0, file_stats);
        was_inserted = true;
        break;
      }
    }

    if (!was_inserted) {
      // must be less than the lowest value, insert at index 0
      sorted_file_stats.splice(j, 0, file_stats);
      was_inserted = true;
    }
  }

  return sorted_file_stats;
}

//getDateSortedFileList("C:\\Users\\Rohan\\Documents\\Guild Wars 2\\addons\\arcdps\\arcdps.cbtlogs");

function getNewBossLogs(_dir, _min_time)
{
  // loop over folders
  var all_logged = getLogFileJSON('all.json');

  // Log start time/date for publishing logs
  const date = new Date(_min_time); // get the latest date you'd like to upload logs from
  console.log(`Logs for ${date.toString()} and after:`);

  // filter logs that haven't been uploaded and are greater than min_time birth
  var logs_to_upload = []
  let files = getDateSortedFileList(_dir);
  for (file of files) {
    let file_birth = new Date(file.birthtime);
    // make sure the file isn't too old
    if (file_birth < _min_time) {
      continue;
    }
    // check to see if the log has already been uploaded
    if (all_logged[file.name] === undefined) {
      logs_to_upload.push(file);
    }
  }

  return logs_to_upload
}

/*
_log_file - must have properties birthtime, name, and path
_user_token - token for dps.report
*/
async function uploadNewBossLog(_log_file, _user_token) {
  // update to latest version of log file
  all_logged = getLogFileJSON('all.json');

  let log_url = await uploadLog(_log_file, _user_token);
  if (log_url === null) {
    console.log("Error uploading log: " + _log_file.name);
    count++;
    return;
  }
  let log_json = await getLogJSON(log_url);
  if (log_json === null) {
    console.log("Error fetching log JSON: " + log_url);
    return;
  }

  let actual_encounter = getBossNameFromID(log_json.triggerID);
  if (actual_encounter === "Unknown") {
    console.log("Unknown encounter " + log_json.fightName + " " + log_json.triggerID);
    actual_encounter = `Unknown ${log_json.fightName}`
  }
  // get all the data I want. ref: https://dps.report/getJson?id=6Fpq-log
  all_logged[_log_file.name] = {
    "url": log_url,
    "file": _log_file.name,
    "boss": actual_encounter,
    "fightIcon": log_json.fightIcon,
    "duration": log_json.duration,
    "startTime": log_json.timeStart,
    "success": log_json.success,
    "isCM": log_json.isCM,
    "targets": [],
    "players": []
  };

  for (target of log_json.targets) {
    let boss_name = getBossNameFromID(target.id)
    // if the ID is found in the ID list it must be a supported boss so it is a primary target.
    let target_data = {
      "name": boss_name === "Unknown" ? target.name : boss_name,
      "isPrimary": boss_name !== "Unknown",
      "healthPercentBurned": target.healthPercentBurned
    }
    all_logged[_log_file.name].targets.push(target_data);
  }

  for (player of log_json.players) {
    let player_data = {
      "account": player.account,
      "name": player.name,
      "subgroup": player.group,
      "profession": player.profession
    }

    all_logged[_log_file.name].players.push(player_data);
  }

  console.log(`Writing ${_log_file.name}`);
  // write to log file. While ineficient this prevents out of memory errors when writing all at once.
  let all_logged_string = JSON.stringify(all_logged, null, 2);
  fs.writeFileSync('./resources/all.json', all_logged_string);
  ipcRenderer.send('log-added', all_logged[log.name]);
}

// 1) Get the name/date of last logged | null
// 2) Loop over files in folder with newer date than latest logged and log them
// 3) Update stored latest logged
// 4) Store in all.json | weekly.json for logs in the week 
async function uploadBossLogsFromDir(_dir, _user_token, _min_time) {
  // get log file with all log data
  var all_logged = getLogFileJSON('all.json');

  // Log start time/date for publishing logs
  const date = new Date(_min_time); // get the latest date you'd like to upload logs from

  // filter logs that haven't been uploaded and are greater than min_time birth
  var logs_to_upload = []
  let files = getDateSortedFileList(_dir);
  for (file of files) {
    let file_birth = new Date(file.birthtime);
    // make sure the file isn't too old
    if (file_birth < _min_time) {
      continue;
    }

    if (all_logged[file.name] === undefined) {
      logs_to_upload.push(file);
    }
  }

  // upload logs
  let count = 0;
  for (log of logs_to_upload) {
    uploadNewBossLog(log, _user_token)
    count++;
  }
}

var d = new Date();
d.setMonth(d.getMonth() - 1);
d.setHours(0, 0, 0);
d.setMilliseconds(0);

//uploadNewBossLogs("C:\\Users\\Rohan\\Documents\\Guild Wars 2\\addons\\arcdps\\arcdps.cbtlogs", d);

//uploadLogs("C:\\Users\\Rohan\\Documents\\Guild Wars 2\\addons\\arcdps\\arcdps.cbtlogs\\Xera\\20200418-205757.evtc");
//console.log(getMostRecentFileName("C:\\Users\\Rohan\\Documents\\Guild Wars 2\\addons\\arcdps\\arcdps.cbtlogs\\Xeras"));

module.exports = {
  getUserToken,
  getNewBossLogs,
  uploadNewBossLog
}