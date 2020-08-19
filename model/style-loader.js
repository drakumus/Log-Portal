const fs = require('fs');
var $ = jQuery = require('jquery');

try
{
  var settings = JSON.parse(fs.readFileSync('./resources/settings.json', 'utf8'));
  $("#styler").attr('href', `../includes/styles/${settings.style.toLowerCase()}.min.css`)
} catch (err)
{
  console.log("Settings file has not been created yet.");
}