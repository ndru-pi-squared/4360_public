// required packages
const request = require('request');
const readline = require('readline');

// start to build the URL of api
var preparedURL = "https://phl.carto.com/api/v2/sql?q=";

var params = [];//array will store parameters to prep the URL with
const limit = 10; // limits the data response. without an response, the query will take a long time to return data

var log = console.log;


// create interface to get user input and display output
var readLine = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


// get user input
var recursiveAsyncReadLine = function () {
  readLine.question('Enter first name : ', (firstName) => {
    if (firstName == 'exit'){
        return readLine.close();}
    if (firstName == '') {
      log("No name was entered.");
      return recursiveAsyncReadLine();
    }
    if (firstName.indexOf(';') > -1){ //semicolon found, suspected malicious use, scrub/validate input in case api becomes insecure
      log("You have entered unfamilliar input. Please enter only characters and digits.");
      return recursiveAsyncReadLine();
    }
    readLine.question('Enter last name : ', (lastName) => {

      if (lastName == 'exit')
        return readLine.close();

      if (lastName == '') {
        return recursiveAsyncReadLine();
        log("No name was entered.");
      }
      if (lastName.indexOf(';') > -1){ //semicolon found, validate input
        return recursiveAsyncReadLine();
        log("You have entered unfamilliar input. Please enter only characters and digits.");
      }
      // otherwise, make request
      log("The name you entered was: ", firstName, lastName);

      getProperties(lastName.toUpperCase() + ' ' + firstName.toUpperCase());
      recursiveAsyncReadLine();
    });
  });
}


var pushParams = function (params) { 
  //input: takes the parameters and populates an array
  //output: void

  params.push("owner_1");
  params.push("sale_date");
  params.push("sale_price");
  params.push("year_built");
  params.push("mailing_street");
}


var prepareStatement = function (params){ 
  //input: takes the query parameters array
  //output: returns the formatted SQL statement

  pushParams(params);                     
  var statement = "SELECT " + params + " FROM opa_properties_public";
  //log("testing statement" + statement);
  return statement;
}


var getProperties = function (name) {
  //input: takes a name supplied by user
  //output: returns property info and coordinates of all addresses under similar names
  //makes a request to the philadelphia api to get property data
  //and supplies the mailing address it retrieves to a geocoding api in order to get the coordinates

  // convert name to uppercase and add to query
  
  var query = `${preparedURL} WHERE owner_1 LIKE '${name}%25' LIMIT 10`; // %25 is % .... SQL LIKE operator
  //log("testing query: " + query); //debugging

  // make the call
  request(query, function (error, response, body) {

    if (error) {
      log('error:', error); // Print the error if one occurred
      return
    }

    log('statusCode:', response && response.statusCode); // Print the response status code if a response was received

    // parse json data
    var data = JSON.parse(body);
    log(data);
    var allAddressesToGeolocate = [];
    log("\nGELOCATING");
    for(var i = 0; i <= data.rows.length-1; i++){
      allAddressesToGeolocate[i] = data.rows[i].mailing_street;
      //log("testing addresses to geolocate: " + allAddressesToGeolocate[i]);
      if(allAddressesToGeolocate[i] != ""){//prevent null requests
        
        var c = allAddressesToGeolocate[i].charAt(0);//sample the first character
        //log("testing c: " + c);
        if(c >=0 && c<=9){//if the first character is a number, the address is in the proper format (improper format is 'PO box xyz')
          allAddressesToGeolocate[i] = allAddressesToGeolocate[i].replace(/\s*$/,"");
          allAddressesToGeolocate[i] = allAddressesToGeolocate[i] + " PHILADELPHIA PA";
          log(allAddressesToGeolocate[i]);
          getMap(allAddressesToGeolocate[i]);
        }
        
      }
    } 
    recursiveAsyncReadLine(); // Calling this function again to ask new question
  });
}


var formatGeocodingAddress = function(addressToFormat){
  //input: a string address with spaces
  //output: the same address, spaces replaced with '+'
  //helps format the URL for the geocoding api

  var formattedAddress = addressToFormat.split(' ').join('+');
  //log("testing formatted address: " + formattedAddress);
  return formattedAddress;
}


var getMap = function (mailingAddress) {
  //input: takes a mailing address supplied by the philadelphia api
  //output: returns the coordinates the the address supplied

  if(mailingAddress != ""){
    //log("testing mailingAddress: " + mailingAddress);
    geocodeURL = "https://api.geocod.io/v1.3/geocode?q=" + formatGeocodingAddress(mailingAddress) + "&api_key=126a657ce501575c55c35ee2c1156c5c00ae607" //+ argv[1] if we want to use environment vars
    //log("testing geocodeURL: " + geocodeURL);
    request(geocodeURL, function (error, response, body) {

      if (error) {
        log('error:', error); // Print the error if one occurred
        return
      }

      log('statusCode:', response && response.statusCode); // Print the response status code if a response was received

      // parse json data
      var data = JSON.parse(body);
      console.log("\ndata: %j", data);

      recursiveAsyncReadLine();
    });
  }
}

//*************************************************************************
//prepare the URL and start to retrieve user input
preparedURL = preparedURL.concat(prepareStatement(params));
recursiveAsyncReadLine(); 
//*************************************************************************
