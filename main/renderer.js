// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const fs = require('fs');
const remote = require('electron').remote;
const BrowserWindow = remote.BrowserWindow;
var $ = jQuery = require('jquery');
var helpers = require('../model/helpers');
require('datatables.net-dt' )();
require('electron-titlebar');
const shell = require('electron').shell;
$(document).on('click', 'a[href^="http"]', function(event) {
    event.preventDefault();
    shell.openExternal(this.href);
});

const DEBUG_ALL = false;

try{
  var settings = JSON.parse(fs.readFileSync('./resources/settings.json', 'utf8'));
} catch (err)
{
  var settings = {};
}

// listener to populate the table
function addLogDataToTable()
{
    try
    {
      var logged = JSON.parse(fs.readFileSync(`./resources/all.json`, 'utf8'))
    } catch (err)
    {
      console.log("no logged encounters yet.");
      var logged = {}
    }
    let table_body = document.querySelector('tbody[id=log-body]');
    let row_arr = [];
    
    for(log_name in logged)
    {
      let log = logged[log_name];
      let healths = ""
      for(target of log.targets)
      {
        if(target.isPrimary)
        {
          let healthPercent = 100-Math.round(target.healthPercentBurned);
          healths += 
          `<div>
            <div class="progress position-relative mb-1  mt-1">
              <div class="progress-bar bg-success" role="progressbar" style="width: ${healthPercent}%; text-align: center;" aria-valuenow="${healthPercent}" aria-valuemin="0" aria-valuemax="100"></div>
              <label class=" healthBar justify-content-center d-flex position-absolute w-100 align-center">${healthPercent}%</label>
            </div>
          </div>`
        }
      }
      row_arr.push(`<td scope="row">${log.boss}</td>
                    <td>${log.success ? '✅': '❌'}</td>
                    <td>
                    ${healths}
                    </td>
                    <td>${log.startTime}</td>
                    <td><a href="${log.url}">${log.url}</a></td>`);
    }

    /*
      <td><div class="health-box">
        <div class="health-bar" style="width: ${healthPercent}%"></div>
        <div class="health-bar-text">${healthPercent}%</div>
      </div></td>
    */

    row_arr.forEach(item => {
      let tr = document.createElement('tr');
      tr.innerHTML = item;
      table_body.appendChild(tr);
    });
}

addLogDataToTable();

function addLogToTable(log)
{
  let table = $('#bossTable').DataTable();

  let healths = ""
  for(target of log.targets)
  {
    if(target.isPrimary)
    {
      let healthPercent = 100-Math.round(target.healthPercentBurned);
      healths += 
      `<div>
        <div class="progress position-relative mb-1  mt-1">
          <div class="progress-bar bg-success" role="progressbar" style="width: ${healthPercent}%; text-align: center;" aria-valuenow="${healthPercent}" aria-valuemin="0" aria-valuemax="100"></div>
          <label class=" healthBar justify-content-center d-flex position-absolute w-100 align-center">${healthPercent}%</label>
        </div>
      </div>`
    }
  }

  let url = `<a href="${log.url}">${log.url}</a>`

  table.row.add([log.boss, log.success ? '✅': '❌', healths, log.startTime, url]).draw();
}

/* Add settings window to settings button */
const settings_button = document.getElementById('btnSettings');
settings_button.addEventListener('click', () => {
  var settings_win = new BrowserWindow({
    height: 600,
    width: 800,
    frame: false,
    webPreferences: {
      nodeIntegration: true
    },
    show: false
  });
  settings_win.webContents.once('did-finish-load', () => {
    settings_win.show();
  });

  settings_win.loadFile('./settings/settings.html');

  var debug_settings = DEBUG_ALL ? DEBUG_ALL : false;
  if(debug_settings)
  {
    let devtools = new BrowserWindow();
    settings_win.webContents.setDevToolsWebContents(devtools.webContents)
    settings_win.webContents.openDevTools({ mode: 'detach' })
  }
});

/* Add upload window to upload button */
var upload_win;
const upload_button = document.getElementById('btnUpload');
upload_button.addEventListener('click', () => {
  try{
    var current_settings = JSON.parse(fs.readFileSync('./resources/settings.json', 'utf8'));
  } catch (err)
  {
    var current_settings = {};
    console.log("No settings yet");
  }

  if(current_settings.path && current_settings.apiKey)
  {
    upload_win = new BrowserWindow({
      height: 80,
      width: 400,
      frame: false,
      resizable: false,
      webPreferences: {
        nodeIntegration: true
      },
      show: false
    });
    upload_win.webContents.once('did-finish-load', () => {
      upload_win.show();
    });
  
    upload_win.loadFile('./upload/upload.html');
    var debug_upload = true;// DEBUG_ALL ? DEBUG_ALL : false;
    if(debug_upload)
    {
      let devtools = new BrowserWindow();
      upload_win.webContents.setDevToolsWebContents(devtools.webContents)
      upload_win.webContents.openDevTools({ mode: 'detach' })
    }
  } else
  {
    options = {
      type: "warning",
      message: "Make you've set your api key and log folder in settings before attempting to upload.",
      title: `Missing: ${!current_settings.path ? "folder" : ""} ${!current_settings.apiKey? "api key": ""}`
    }
    remote.dialog.showMessageBox(null, options);
  }
});

var discord_win;
/* Discord Webhook */
const discord_button = document.getElementById('btnDiscord');
discord_button.addEventListener('click', () => {
  try{
    var current_logs = JSON.parse(fs.readFileSync('./resources/all.json', 'utf8'));
  } catch
  {
    options = {
      type: "warning",
      message: "Upload some logs before attempting to push to discord.",
      title: `Missing Logs`
    }
    remote.dialog.showMessageBox(null, options);
    var current_settings = undefined;
  }
  if(current_logs)
  {
    discord_win = new BrowserWindow({
      height: 145,
      width: 400,
      frame: false,
      resizable: false,
      webPreferences: {
        nodeIntegration: true
      },
      show: false
    });
    discord_win.webContents.once('did-finish-load', () => {
      discord_win.show();
    });

    discord_win.loadFile('./discord/discord.html');
    var debug_discord = DEBUG_ALL ? DEBUG_ALL : false;
    if(debug_discord)
    {
      let devtools = new BrowserWindow();
      discord_win.webContents.setDevToolsWebContents(devtools.webContents)
      discord_win.webContents.openDevTools({ mode: 'detach' })
    }
  }
});

/* get the style set in settings */
const { ipcRenderer } = require('electron');

ipcRenderer.on('set-main-style', (event, arg) => {
  helpers.setStyle(arg);
  if(upload_win)
  {
    console.log("Sending upload win")
    upload_win.webContents.send('set-upload-style', arg);
  }
  if(discord_win)
  {
    console.log("Sending discord win")
    discord_win.webContents.send('set-discord-style', arg);
  }
});

ipcRenderer.on('reload-table', (event, arg) => {
  addLogToTable(arg); // arg is log object
});