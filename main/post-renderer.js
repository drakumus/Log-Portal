const fs = require('fs');
const compareWeek = require('compare-week');

/*  filtering function which will search */
let encounters = require('../resources/encounters.json');
function inCategory(encounter_name, categories)
{
  let encounter_matches = encounters.filter(encounter_data => encounter_data.name === encounter_name);
  if(encounter_matches.length === 1)
  {
    console.log(encounter_matches[0].name)
    for(category of categories)
    {
      let isMatch = encounter_matches[0].categories.indexOf(category) > -1;
      if(!isMatch)
      {
        return false
      }
    }
    return true;
  }
  return false;
}

$.fn.dataTable.ext.search.push(
  function( settings, data, dataIndex ) {
    var encounter_name = data[0]; // use data for the age column
    let d = new Date(data[3]);
    let now = new Date(Date.now());

    bosses = []
    // get the current active button
    switch($('.btn-group > .active').attr("id"))
    {
      case 'btnAll':
        return true;
        break;
      case 'btnW1':
        return inCategory(encounter_name, ["Raid Bosses","1"]);
        break;
      case 'btnW2':
        return inCategory(encounter_name, ["Raid Bosses","2"]);
        break;
      case 'btnW3':
        return inCategory(encounter_name, ["Raid Bosses","3"]);
        break;
      case 'btnW4':
        return inCategory(encounter_name, ["Raid Bosses","4"]);
        break;
      case 'btnW5':
        return inCategory(encounter_name, ["Raid Bosses","5"]);
        break;
      case 'btnW6':
        return inCategory(encounter_name, ["Raid Bosses","6"]);
        break;
      case 'btnW7':
        return inCategory(encounter_name, ["Raid Bosses","7"]);
        break;
      case 'btnFractals':
        return inCategory(encounter_name, ["Fractals"]);
        break;
      case 'btnStrikes':
        return inCategory(encounter_name, ["Strikes"]);
        break;
      case 'btnGolem':
        return inCategory(encounter_name, ["Golems"]);
        break;
      case 'btnToday':
        var yesterday = new Date();
        yesterday.setDate(now.getDate()-1);
        if(d.getTime() >= yesterday.getTime()) {
          return true;
        }
        return false;
        break;
      case 'btnWeek':
        return compareWeek(now, d);
        break;
    }
  }
);

// listener for filters
$(".btn-group > .filter-btn").click(function(){
  $(".btn-group > .btn").removeClass("active");
  $(this).addClass("active");
  table.draw();
});