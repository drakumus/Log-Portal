
var $ = jQuery = require('jquery');

function setStyle(style_name)
{
    $("#styler").attr('href', `../includes/styles/${style_name.toLowerCase()}.min.css`);
}

module.exports = {
  setStyle
};