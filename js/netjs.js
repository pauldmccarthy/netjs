define(
  ["netvis", "netdata", "netctrl", "netvis_dynamics"], 
  function(netvis, netdata, netctrl, dynamics) {

  function displayNetwork(network, div, width, height) {
    netvis.displayNetwork(network, div, width, height);
    dynamics.configDynamics(network);
  }

  var netjs = {};
  netjs.loadNetwork            = netdata.loadNetwork;
  netjs.setNumClusters         = netdata.setNumClusters;
  netjs.setEdgeWidthWeightIdx  = netdata.setEdgeWidthWeightIdx;
  netjs.setEdgeColourWeightIdx = netdata.setEdgeColourWeightIdx;
  netjs.displayNetwork         = displayNetwork;
  netjs.redrawNetwork          = netvis.redrawNetwork;
  netjs.createNetworkControls  = netctrl.createNetworkControls;

  return netjs;
});
