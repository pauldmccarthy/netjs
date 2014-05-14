define(
  ["netvis", "netdata", "netctrl", "netvis_dynamics"], 
  function(netvis, netdata, netctrl, dynamics) {


  function displayNetwork(
    network, 
    networkDiv, 
    subNetDiv, 
    controlDiv,
    networkWidth, 
    networkHeight,
    subNetWidth,
    subNetHeight) {

    netvis.displayNetwork(network, networkDiv, networkWidth, networkHeight);
    dynamics.configDynamics(network); 

    netctrl.createNetworkControls(
      network, controlDiv, subNetDiv, subNetWidth, subNetHeight);
  }

  var netjs = {};
  netjs.loadNetwork    = netdata.loadNetwork;
  netjs.displayNetwork = displayNetwork;

  return netjs;
});
