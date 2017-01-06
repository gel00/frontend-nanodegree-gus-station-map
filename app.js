/*
 * This is my google map application,
 * that detects gus stations nearby.
 * There are a distance and a fueltype filter built in.
 */

// This is a ovservable variable for inputs
var gusStations = ko.observableArray([]);

// This the viewmodel for sidebar
var ViewModel = function() {
    var self = this;

    this.stations = gusStations;
    // This is an unused variable for further functionality
    this.currentStation = ko.observable(this.stations()[0]);
    //inital value for distance filter
    this.distance = ko.observable("50");
    /*
    * When distance filter modified this function
    * changes some parameter and displayed value
    * Also triggers a new searc(Easyer to run here).
    */
    this.setRadius = function(data, event) {
        var value = event.target.value;
        //controlling rage values in filter
        switch (value) {
            case "6":
            case "7":
            case "8":
            case "9":
            case "10":
                value = (value - 5) * 10;
                break;
        }
        this.distance(value);
        radius = value * 1000;
        search(center);
    }

};

// starting sidebar viewmodel
ko.applyBindings(new ViewModel());
// This function runs when radiobutton has clicked
function changeCarType(value) {
    carType = value;
    search(center);
}
//some initial variable for the map
var carType = "gus";
var map;
var infowindow;
var radius = 50000;
var markers = [];
var center = {
    lat: 46.278361,
    lng: 20.153076
};
var defaultIcon;
var highlightedIcon

//this function creats the whole map at  the begining
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: center,
        zoom: 9
    });
    //creating some markerIcons
    defaultIcon = makeMarkerIcon('0091ff');
    highlightedIcon = makeMarkerIcon('FFFF24');

    infowindow = new google.maps.InfoWindow();
    // it runs the first search
    search(center);
    //after moving the map, the location for search will chang too
    map.addListener('center_changed', function() {
        center = {
            lat: map.center.lat(),
            lng: map.center.lng()
        };
    });
}
// this function checks the type of the search and executes it
function search(location) {
    switch (carType) {
        case "gus":
            searchGus(location);
            break;
        case "eletric":
            searchEletric(location);
    }
}
// google api nearby search for gus stations
function searchGus(location) {
    hideListings();
    var service = new google.maps.places.PlacesService(map);
    service.nearbySearch({
        location: location,
        radius: radius,
        type: ['gas_station']
    }, callback);
}
// This function runs after the google api nearby search response
function callback(results, status) {
    // if status is ok
    if (status === google.maps.places.PlacesServiceStatus.OK) {
        // it redefines the gusStation array
        gusStations(results);
        // if no station has found it shows an error message
        if (results.length == 0) {
            window.alert('We did not find any places matching that search!');
        } else {
            // For each place, get the icon, name and location.
            for (var i = 0; i < results.length; i++) {
                createMarker(results[i]);

            }
        }

    }
}
//this icon creater function based on the passed in collor
function makeMarkerIcon(markerColor) {
    var markerImage = new google.maps.MarkerImage(
        'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + markerColor +
        '|40|_|%E2%80%A2',
        new google.maps.Size(21, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(10, 34),
        new google.maps.Size(21, 34));
    return markerImage;
}
// this function hides previos markers from previos serches
function hideListings() {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
}

// this function creats marker for locations
function createMarker(place) {
    var placeLoc = place.geometry.location;
    var marker = new google.maps.Marker({
        map: map,
        position: placeLoc,
        animation: google.maps.Animation.DROP,
        title: place.name,
        icon: defaultIcon,
        id: place.place_id || null  //null if it isn't came from google search
    });
    markers.push(marker);
    var placeInfoWindow = new google.maps.InfoWindow();
    // event listener for infobars
    marker.addListener('click', function() {
        // if it comes from google search
        if (this.id) {
            if (placeInfoWindow.marker == this) {
                console.log("This infowindow already is on this marker!");
            } else {
                getPlacesDetails(this, placeInfoWindow);
            }
            //if it isn't come from google search
        } else {
            infowindow.setContent(place.name);
            infowindow.open(map, this);
        }

    });
    // effects for hover over markers
    marker.addListener('mouseover', function() {
        this.setIcon(highlightedIcon);
    });
    marker.addListener('mouseout', function() {
        this.setIcon(defaultIcon);
    });
}

// this function is make request for eletric charger stations
function searchEletric(location) {
    hideListings();
    var eStationsURL = "http://api.openchargemap.io/v2/poi/?output=json&countrycode=HU&maxresults=10&latitude=" + location.lat + "&longitude=" + location.lng + "&distance=" + radius / 1000 + "&distanceunit=KM";
    // the request itself
    $.getJSON(eStationsURL, function(data) {

        if (data.length) {
            var stations = [];
            data.forEach(function(station) {
                var elem = makeGooglish(station);
                createMarker(elem);
                stations.push(elem);
            });
            gusStations(stations);
        }
// error message if the request falis
    }).fail(function(e) {
        alert("Service currently not available");
    });
}

// this function convers the result of the request as it would come from google
function makeGooglish(station) {
    var address = station.AddressInfo;
    var modified = {
        name: address.Title,
        vicinity: address.Town + ", " + address.AddressLine1,
        geometry: {
            location: new google.maps.LatLng(address.Latitude, address.Longitude)
        }
    };
    return modified;
}
// This is the PLACE DETAILS search - it's the most detailed so it's only
// executed when a marker is selected, indicating the user wants more
// details about that place.
function getPlacesDetails(marker, infowindow) {
    var service = new google.maps.places.PlacesService(map);
    service.getDetails({
        placeId: marker.id
    }, function(place, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            // Set the marker property on this infowindow so it isn't created again.
            infowindow.marker = marker;
            var innerHTML = '<div>';
            if (place.name) {
                innerHTML += '<strong>' + place.name + '</strong>';
            }
            if (place.formatted_address) {
                innerHTML += '<br>' + place.formatted_address;
            }
            if (place.formatted_phone_number) {
                innerHTML += '<br> tel:' + place.formatted_phone_number;
            }
            if (place.opening_hours) {
                innerHTML += '<br><br><strong>Hours:</strong><br>' +
                    place.opening_hours.weekday_text[0] + '<br>' +
                    place.opening_hours.weekday_text[1] + '<br>' +
                    place.opening_hours.weekday_text[2] + '<br>' +
                    place.opening_hours.weekday_text[3] + '<br>' +
                    place.opening_hours.weekday_text[4] + '<br>' +
                    place.opening_hours.weekday_text[5] + '<br>' +
                    place.opening_hours.weekday_text[6];
            }
            if (place.photos) {
                innerHTML += '<br><br><img src="' + place.photos[0].getUrl({
                    maxHeight: 100,
                    maxWidth: 200
                }) + '">';
            }
            innerHTML += '</div>';
            infowindow.setContent(innerHTML);
            infowindow.open(map, marker);
            // Make sure the marker property is cleared if the infowindow is closed.
            infowindow.addListener('closeclick', function() {
                infowindow.marker = null;
            });
        }
    });
}
