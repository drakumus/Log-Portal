require('electron-titlebar');
let fs = require('fs');
//var $ = jQuery = require('jquery');
const {dialog} = require('electron').remote;
const { ipcRenderer } = require('electron');
var log_uploader = require('../model/log-uploader');
var helpers = require('../model/helpers');

try{
    var settings = JSON.parse(fs.readFileSync('./resources/settings.json', 'utf8'));
    $(`.style-btn:contains('${settings.style}')`).removeClass('btn-primary');
    $(`.style-btn:contains('${settings.style}')`).addClass('btn-secondary');
} catch (err)
{
    var settings = {};
    settings.style = "slate";
    saveSettings();
}

if(settings.path !== undefined)
{
    document.getElementById('dirs').value = settings.path;
}

if(settings.apiKey !== undefined)
{
    document.getElementById('apiKeyText').value = settings.apiKey;
    document.getElementById('apiButton').disabled = true;
    $('#apiBtnContainer').attr("data-toggle", "tooltip");
    $('#apiBtnContainer').attr("title", "This is disabled to keep people from accidentally changing their API key. You can manually paste in an existing api key at any point and it will be saved. Do so at your own risk.");
}

// add event handler to upload button
document.getElementById('dirsButton').addEventListener('click', () => {
    let options = {
        title : "Custom title bar",
        defaultPath : `${require('os').homedir()}\\Documents\\Guild Wars 2\\addons\\arcdps\\arcdps.cbtlogs`,
        properties: ['openDirectory']
    }

    //Synchronous
    let filePaths = dialog.showOpenDialogSync(options);
    if(filePaths != undefined && filePaths.length == 1)
    {
        document.getElementById('dirs').value = filePaths[0];
        settings.path = filePaths[0];
        saveSettings();
    }
});

document.getElementById('apiButton').addEventListener('click', async function() {
    let token = await log_uploader.getUserToken();
    if(token !== null)
    {
        document.getElementById('apiKeyText').value = token.userToken;
        settings.apiKey = token.userToken;
        document.getElementById('apiButton').disabled = true;
        $('#apiBtnContainer').attr("data-toggle", "tooltip");
        $('#apiBtnContainer').attr("title", "This is disabled to keep people from accidentally changing their API key. You can manually paste in an existing api key at any point and it will be saved. Do so at your own risk.");
        $('#apiBtnContainer').tooltip();
        saveSettings();
    }
});

document.getElementById('apiKeyText').addEventListener('change', async function() {
    if(this.value.length > 0)
    {
        settings.apiKey = this.value;
        if(!document.getElementById('apiButton').disabled)
        {
            document.getElementById('apiButton').disabled = true;
            $('#apiBtnContainer').attr("data-toggle", "tooltip");
            $('#apiBtnContainer').attr("title", "This is disabled to keep people from accidentally changing their API key. You can manually paste in an existing api key at any point and it will be saved. Do so at your own risk.");
            $('#apiBtnContainer').tooltip();
        }
        saveSettings();
    }
});

function saveSettings()
{
    let settings_string = JSON.stringify(settings, null, 2);
    fs.writeFileSync('./resources/settings.json', settings_string)
}

// listener for filters
$(".style-btn").click(function(){
    $(".style-btn").removeClass("btn-primary");
    $(".style-btn").removeClass("btn-secondary");
    $(".style-btn").addClass("btn-primary");
    let style_text = this.innerText;
    // store in settings
    settings.style = style_text;
    saveSettings();
    // let the main window know the style has been changed.
    ipcRenderer.send('change-style', style_text);
    
    $(`.style-btn:contains('${style_text}')`).removeClass('btn-primary');
    $(`.style-btn:contains('${style_text}')`).addClass('btn-secondary');

    helpers.setStyle(style_text)
});