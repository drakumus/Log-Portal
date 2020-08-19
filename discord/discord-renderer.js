require('electron-titlebar');
let fs = require('fs');
const remote = require('electron').remote;
const Discord = require('discord.js');
var helpers = require('../model/helpers');

function saveSettings()
{
  let settings_string = JSON.stringify(settings, null, 2);
  fs.writeFileSync('./resources/settings.json', settings_string)
}
/*                  */

/* Get the settings file  */
try{
  var settings = JSON.parse(fs.readFileSync('./resources/settings.json', 'utf8'));
  helpers.setStyle(settings.style);
} catch (err)
{
  var settings = {};
}

if(settings.discord_hook !== undefined)
{
  document.getElementById("discordHookInput").value = settings.discord_hook;
}

// store a discord webhook
document.getElementById('discordHookInput').addEventListener('change', async function() {
  if(this.value.length > 0)
  {
      settings.discord_hook = this.value;
      saveSettings();
  }
});

// send a message on send button click
document.getElementById('btnSend').addEventListener("click", () =>
{
  let msg = getDiscordMessage();
  var hook = getWebhookDataFromURL(settings.discord_hook)
  if (hook !== null && msg.length > 0)
  {
    const webhookClient = new Discord.WebhookClient(hook.id, hook.token);
    webhookClient.send(msg);
  }
  if (msg.length === 0)
  {
    options = {
      type: "warning",
      message: "There's nothing new to send to discord.\nNote: If the logs are not from the last24 hours they wont be sent to discord.",
      title: `Nothing to upload to discord`
    }
    remote.dialog.showMessageBox(null, options);
  }
});

// handle style change
const { ipcRenderer } = require('electron');
ipcRenderer.on('set-discord-style', (event, arg) => {
  helpers.setStyle(arg);
});

function getEncounterHealthBurned(log)
{
  let totalHealthPercentBurned = 0;
  for(target of log.targets)
  {
    if(target.isPrimary)
    {
      totalHealthPercentBurned += target.healthPercentBurned;
    }
  }
  return totalHealthPercentBurned;
}


function getDiscordMessage(){
  // get all.json
  const logs = JSON.parse(fs.readFileSync('./resources/all.json', 'utf8'));
  // find all logs with a date > date - 1
  let now = new Date(Date.now());
  let yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  let last_date = new Date(Date.now());
  if(settings.last_discord_log_date !== undefined) 
  {
    console.log('setting date to settings date')
    console.log(settings.last_discord_log_date);
    last_date = new Date(settings.last_discord_log_date); 
    // set last date to yesterday to avoid uploaded logs over more than 1 day to discord
    console.log(last_date.getTime())
    if(yesterday.getTime() > last_date.getTime())
    {
      last_date = yesterday;
    }
  } else
  {
    console.log('setting date to yesterday');
    // set to yesterday
    last_date.setDate(now.getDate()-1);
  }
  let newest_log = last_date;
  let day_raids = {};
  for(var file_name in logs)
  {
    if(!logs.hasOwnProperty(file_name))
    {
      continue;
    }
    let log = logs[file_name];
    let d = new Date(log.startTime);
    if(d.getTime() > last_date.getTime())
    {
      if(d.getTime() > newest_log.getTime())
      {
        newest_log = d;
      }
      if(!day_raids.hasOwnProperty(log.boss))
      {
        day_raids[log.boss] = {};
        day_raids[log.boss].pulls = 1;
        day_raids[log.boss].log = log;
      } else
      {
        day_raids[log.boss].pulls += 1;
        // get total health burned of encounter
        if(getEncounterHealthBurned(log) > getEncounterHealthBurned(day_raids[log.boss].log))
        {
          // total health burned is better in this pull, report it instead.
          day_raids[log.boss].log = log;
        }
      }
    }
  }

  // add newest date to log file
  settings.last_discord_log_date = newest_log.getTime();
  saveSettings();

  console.log(day_raids);

  let message = "";
  for(var boss in day_raids)
  {
    let pulls = day_raids[boss].pulls;
    if(day_raids[boss].log.success)
    {
      message += `✅ ${boss} (${pulls} pull${pulls > 1  ? 's' : ''}): ${day_raids[boss].log.url}` 
    } else
    {
      message += `❌ ${boss} (best pull of ${pulls} pull${pulls > 1  ? 's' : ''}): ${day_raids[boss].log.url}` 
    }
    message += `\n`
  }
  return message;
}

function getWebhookDataFromURL(url)
{
  let match= url.match(/(?<=api\/webhooks\/).*/);
  console.log(match);
  // could not find valid match.
  if(match.length !== 1)
  {
    return null;
  }
  let raw = match[0].split("/");
  console.log(raw)
  return {
    id: raw[0],
    token: raw[1]
  }
}