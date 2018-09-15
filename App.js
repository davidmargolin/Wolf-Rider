import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, TextInput, KeyboardAvoidingView } from 'react-native';
import { MapView, Permissions, Location, Constants } from 'expo';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { MaterialIcons } from '@expo/vector-icons';
import style from './mapStyle'
export default class App extends React.Component {

    state = {
        busData: [],
        bikeData: [],
        busStops: [],
        location: {
            latitude: 40.912418,
            longitude: -73.123395,
            latitudeDelta: 0.018,
            longitudeDelta: 0.018,
        },
        searchPins: [],
        showBikes: true
    }

    searchQuery = ""

    componentDidMount() {
        this.getStations()
        this.getBusStops()
        setInterval(() => this.getBuses(), 2000);
        this.getLocationAsync();
    }

    getBusStops = () => {
        fetch('https://smarttransit.cewit.stonybrook.edu/user_call/getAllStops.php').then(busStops =>
            busStops.json().then(json =>
                this.setState({ busStops: json })
            )
        )
    }

    getBuses = () => {
        fetch("https://smarttransit.cewit.stonybrook.edu/user_call/getAllActiveBuses.php").then(buses =>
            buses.json().then(json => {
                this.setState({ busData: json })
            })
        )
    }

    getLocationAsync = async () => {
        let { status } = await Permissions.askAsync(Permissions.LOCATION);
        let location = await Location.getCurrentPositionAsync();
        let newlocation = {
            'latitudeDelta': 0.01,
            'longitudeDelta': 0.01,
            'latitude': location.coords.latitude,
            'longitude': location.coords.longitude
        }
        console.log(newlocation)
        this.setState({ location: newlocation });
    };

    getStations = () => {
        fetch("https://sbu.publicbikesystem.net/ube/gbfs/v1/en/station_status").then(station_status =>
            station_status.json()
        ).then(statuses =>
            fetch("https://sbu.publicbikesystem.net/ube/gbfs/v1/en/station_information").then(station_info =>
                station_info.json()
            ).then(station_info => {
                let combined_data = statuses.data.stations.map(station => {
                    let station_id = station.station_id
                    let info = station_info.data.stations.filter(station => station.station_id === station_id)
                    return ({ ...info[0], ...station })
                })
                this.setState({ bikeData: combined_data })
            }
            )
        )

    }

    getBusColor = (routeNum) => {
        if (routeNum === "4") {
            return "green"
        } else if (routeNum === "3") {
            return "purple"
        } else {
            return "transparent"
        }
    }
    getBusLetter = (routeNum) => {
        if (routeNum === "4") {
            return "O"
        } else if (routeNum === "3") {
            return "H"
        } else {
            return ""
        }
    }

    makeSearch = () => {
        let query = this.searchQuery
        fetch("https://us-central1-wolf-216514.cloudfunctions.net/function-1", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({ query })
        }).then(response =>
            response.json()
        ).then(place => {
            if (place.items.length >= 1) {
                let positions = place.items.map(item => item.position)
                console.log(positions)
                this.setState({ searchPins: positions })
            } else {
                this.setState({ searchPins: [] })
            }
        })
    }

    render() {
        return (
            <View style={styles.container}>
                <MapView
                    style={styles.map}
                    provider={MapView.PROVIDER_GOOGLE}
                    customMapStyle={style}
                    initialRegion={this.state.location}
                >
                    {this.state.busData.map(bus =>
                        <MapView.Marker
                            coordinate={{ "longitude": parseFloat(bus.lon), "latitude": parseFloat(bus.lat) }}
                        >
                            <View style={{ backgroundColor: this.getBusColor(bus.routeID), borderRadius: 8 }}>
                                <Text style={{ fontWeight: 'bold', margin: 4, color: 'white' }}>{this.getBusLetter(bus.routeID)}</Text>
                            </View>
                        </MapView.Marker>)
                    }
                    {this.state.busStops.map(stop =>
                        <MapView.Marker
                            coordinate={{ "longitude": parseFloat(stop.lon), "latitude": parseFloat(stop.lat) }}
                        >
                            <View style={{ backgroundColor:'gray', borderRadius: 4, width: 8, height: 8}}>
                            </View>
                        </MapView.Marker>)
                    }
                    {this.state.searchPins.map(pin => <MapView.Marker
                        pinColor='tomato'
                        coordinate={{ "longitude": pin[1], "latitude": pin[0] }}
                    />)}
                    {this.state.bikeData.map(station => "lon" in station &&
                        <MapView.Marker
                            coordinate={{ "longitude": station.lon, "latitude": station.lat }}
                        >
                            <AnimatedCircularProgress
                                style={{ backgroundColor: '#ffffffaa', borderRadius: 15 }}
                                size={30}
                                width={2}
                                fill={this.state.showBikes ?
                                    parseInt((station.num_bikes_available / (station.num_bikes_available + station.num_docks_available)) * 100) :
                                    parseInt((station.num_docks_available / (station.num_bikes_available + station.num_docks_available)) * 100)
                                }
                                tintColor="#002244"
                                backgroundColor="transparent">
                                {
                                    (fill) => (
                                        <Text style={{ fontWeight: 'bold' }}>
                                            {this.state.showBikes ? station.num_bikes_available : station.num_docks_available}
                                        </Text>
                                    )
                                }
                            </AnimatedCircularProgress>
                        </MapView.Marker>
                    )}

                </MapView>
                <Image source={require('./images/rawr.png')} resizeMode="contain" style={{ margin: 20, height: 90, width: 150, position: 'absolute', top: Constants.statusBarHeight, alignSelf: 'center' }} />

                <KeyboardAvoidingView style={{ flexDirection: 'row', justifyContent: 'flex-end', width: '100%' }}
                    behavior="padding"
                >
                    <View style={{ justifyContent: 'flex-end', flex: 1 }}>
                        <KeyboardAvoidingView
                            behavior="padding"
                            style={styles.circleButton2}
                        >
                            <View style={{ flexDirection: 'row', margin: 10 }}>
                                <MaterialIcons name="search" size={25} />

                                <TextInput
                                    style={{ flex: 1, marginHorizontal: 4 }}
                                    underlineColorAndroid="transparent"
                                    onChangeText={(text) => this.searchQuery = text}
                                    onSubmitEditing={() => this.makeSearch()}
                                />
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                    <View style={{ justifyContent: 'flex-end' }}>
                        <TouchableOpacity
                            style={styles.circleButton}
                            onPress={() => this.setState({ showBikes: !this.state.showBikes })}
                        >
                            <MaterialIcons name={this.state.showBikes ? "directions-bike" : "lock-open"} size={25} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.circleButton}
                            onPress={() => this.getStations()}
                        >
                            <MaterialIcons name="refresh" size={25} />

                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
    },
    map: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    circleButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 46, height: 46,
        backgroundColor: 'white',
        marginBottom: 20,
        marginRight: 20,
        borderRadius: 23,
        shadowRadius: 10,
        shadowColor: 'black',
        elevation: 5,
        shadowOpacity: 0.5,
        shadowOffset: { height: 2, width: 2 },
    },
    circleButton2: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        backgroundColor: 'white',
        elevation: 5,
        borderRadius: 24,
        margin: 20
    }
});
