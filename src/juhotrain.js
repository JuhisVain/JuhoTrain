//handles selecting option
function selection(s){
	getData(s);
}

//Should have just used the select to store the station metadata for all functions.
function populateSelect(){
	console.log("populateSelect called!");
	var xmlhttp = new XMLHttpRequest();

	xmlhttp.open("GET", "https://rata.digitraffic.fi/api/v1/metadata/stations",true);
	xmlhttp.send();

	xmlhttp.onreadystatechange = function(){
		if (xmlhttp.readyState == 4 && xmlhttp.status == 200){

			var jspar = JSON.parse(xmlhttp.responseText);
			var sel = document.getElementById("select");

			for (i = 0; i < jspar.length; i++){
				if (!(jspar[i].stationShortCode.indexOf("Ö") >= 0 || jspar[i].stationShortCode.indexOf("Ä") >= 0)){
				sel.innerHTML += "<option value = \""+jspar[i].stationShortCode+"\">"+
					jspar[i].stationName+"</option>";
				}
			}

		}
	}
}

//Called by the button, gets the station metadata and searches for station short codes
function getStationCode(){

	$(".data").not(":eq(0)").slideUp();	//Only works if search was NOT legit(?)

	var stationInput = document.getElementById("stationInput").value;

	var stationCode;

	var xmlhttp = new XMLHttpRequest();

	xmlhttp.open("GET", "https://rata.digitraffic.fi/api/v1/metadata/stations",true);
	xmlhttp.send();

	var jspar;

	xmlhttp.onreadystatechange = function(){
		if (xmlhttp.readyState == 4 && xmlhttp.status == 200){

			jspar = JSON.parse(xmlhttp.responseText);

			stationCode = binSearch(stationInput, jspar);	//Search for stationShortCode


			if (stationCode){	//If a code was found

				//the rata APIs will not work with foreign characters in the URL: you won't be getting timetables for Ähtäri etc.
				if (stationCode.indexOf("Å") >= 0 || stationCode.indexOf("Ö") >= 0 || stationCode.indexOf("Ä") >= 0){
					while (del = document.getElementsByClassName("data")[1]) del.remove();//remove old timetables, but not header
					document.getElementById("message").innerHTML = "Ääkkösiä detected in station's shortcode, not supported!";
					$("#message").fadeIn();
				} else {	//No ÅÖÄ found:
					document.getElementById("message").innerHTML = "";
					$("#message").fadeOut();
					console.log("calling getData with "+stationCode);
					getData(stationCode);
				}
			} else {	//no station short code found:
				console.log("nothing found");
				document.getElementById("message").innerHTML = "Nothing found with \""+stationInput+"\"";
				$("#message").fadeIn();
			}
		}
	}
}

//Getting the timetable data:
function getData(code/*, stationList*/){
	//second parameter was supposed to be for translating destination shortcodes to names
	//but search function doesn't work on unordered data
	
	var mbd = 60;	//Minutes before departure
	var mad = 0;	//minutes after departure
	var mba = 0;	//minutes before arrival
	var maa = 0;	//minutes after arrival

	var source = "https://rata.digitraffic.fi/api/v1/live-trains/station/"+code+
		"?minutes_before_departure="+mbd+
		"&minutes_after_departure="+mad+
		"&minutes_before_arrival="+mba+
		"&minutes_after_arrival="+maa;

	var output = document.getElementById("timetable");

	//delete old data but save list header:
	while (del = document.getElementsByClassName("data")[1]) del.remove();

	var xmlhttp = new XMLHttpRequest();

	xmlhttp.open("GET", source, true);
	xmlhttp.send();

	xmlhttp.onreadystatechange = function(){
		if (xmlhttp.readyState == 4 && xmlhttp.status == 200){

			var jspar = JSON.parse(xmlhttp.responseText);

			//train iterator:
			for (i = 0; i < jspar.length; i++){
				//station interator:
				for (j = 0; j < jspar[i].timeTableRows.length; j++){

					//Check for correct station & departure (instead of arrival):
					if (jspar[i].timeTableRows[j].stationShortCode == code &&
						jspar[i].timeTableRows[j].type == "DEPARTURE"){

						/*
						 *	timezoning received departure time + get actual departure time for starting stations
						 *	or estimated departure times for other stations
						 *	or if for some reason either not available get scheduled time:
						 */
						var cTime;

						if (jspar[i].timeTableRows[j].actualTime){
							cTime = new Date(Date.parse(jspar[i].timeTableRows[j].actualTime));
						} else if (jspar[i].timeTableRows[j].liveEstimateTime){
							cTime = new Date(Date.parse(jspar[i].timeTableRows[j].liveEstimateTime));
						} else cTime = new Date(Date.parse(jspar[i].timeTableRows[j].scheduledTime));

						//CommuterLineID missing from longdistance trains screws with table. Track missing occasionally for some reason
						if (!jspar[i].commuterLineID) jspar[i].commuterLineID = "-";
						if (!jspar[i].timeTableRows[j].commercialTrack) jspar[i].timeTableRows[j].commercialTrack = "-";

						//A train data element inserted temporarily at bottom of list:
						output.innerHTML += `
							<div class="data">
								<div class="lineid">`+jspar[i].commuterLineID+`</div>
								<div class="track">`+jspar[i].timeTableRows[j].commercialTrack+`</div>
								<div class="time">`+cTime.toTimeString().split(" ")[0]+`</div>
								<div class="destination">`+jspar[i].timeTableRows[jspar[i].timeTableRows.length-1].stationShortCode+`</div>
								<div class="category">`+jspar[i].trainCategory+`</div>
								<div class="operator">`+jspar[i].operatorShortCode.toUpperCase()+`</div>
								<div class="trainid">`+jspar[i].trainNumber+`</div>
								<div style="clear:both;"></div>
							</div>
							`;

					}
				}
			}
			sortList();	
		}
	}
}

//Sort & animate the train data lines
function sortList(){
	var train = Array.from( document.getElementsByClassName("data") );//Converting to array for array functions
	//train[0] is the header, remove it from array:
	train.splice(0,1);

	//Sorting traindatas by departure time
	var sortedTrain = train.sort(function(a,b){
		var atime = a.getElementsByClassName("time")[0].innerHTML;
		var btime = b.getElementsByClassName("time")[0].innerHTML;

		if (atime < btime) {return -1;}	//seems to work
		else {return 1;}
	});

	while (del = document.getElementsByClassName("data")[1]) del.remove();//delete old unordered traindatas

	for (i = 0; i < sortedTrain.length; i++){	//rewrite train data

		document.getElementById("timetable").innerHTML += `
			<div class="data">`+
			sortedTrain[i].innerHTML+
			`</div>`;

		//Darken every other line:
		if (i%2) document.getElementsByClassName("data")[i+1].style.backgroundColor = "#bfbfbf";
	}

	//Animate timetable to slide down
	$(".data").not(":eq(0)").hide();
	$(".data").not(":eq(0)").slideDown();

}

//Return searched station's short code:
function binSearch(find, source){
	var start = 0;
	var end = source.length-1;
	var index;

	find = find.toUpperCase();	//Put searched station to uppercase

	var i = 0;
	while (i < 100){ //failsafe. shouldn't take more than ~ 10 loops with 500+ stations on the list
		i++;

		//Confusing: Changes searching index AND fix for last few searches...
		if (index == (index = parseInt((start+end)/2))){
			if (index > 0 && find == source[index-1].stationName.toUpperCase()){ return source[index-1].stationShortCode;}
			else if (index < source.length && find == source[index+1].stationName.toUpperCase()){ return source[index+1].stationShortCode;}
			else {return 0;} //nothing found

		}

		if (find < source[index].stationName.toUpperCase()){
			end = index;
		} else if (find > source[index].stationName.toUpperCase()){
			start = index;
		} else {	//code found
			return source[index].stationShortCode;
		}
	}
}

// tests:

function bsUnitTest(source){ //result: everything found
	console.log("testing binsearch:");

	for (var x in source){
		var code = binSearch(source[x].stationName, source);
		if (code){
			console.log(x+" s: "+source[x].stationName+" : "+code);
		} else {
			console.log("ERROR");
			break;
		}
	}
}

function runTest(){

	var xmlhttp = new XMLHttpRequest();

	xmlhttp.open("GET", "https://rata.digitraffic.fi/api/v1/metadata/stations",true);
	xmlhttp.send();

	var jspar;

	xmlhttp.onreadystatechange = function(){
		if (xmlhttp.readyState == 4 && xmlhttp.status == 200){
			jspar = JSON.parse(xmlhttp.responseText);
			bsUnitTest(jspar);
		}
	}

}

function init(){
	populateSelect();
}

document.onload = init();
