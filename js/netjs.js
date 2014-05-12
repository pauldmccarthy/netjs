define(
  ["netvis", "netdata", "netctrl", "netvis_dynamics"], 
  function(netvis, netdata, netctrl, netvis_dynamics) {

  var netjs = {};
  netjs.loadNetwork            = netdata.loadNetwork;
  netjs.setNumClusters         = netdata.setNumClusters;
  netjs.setEdgeWidthWeightIdx  = netdata.setEdgeWidthWeightIdx;
  netjs.setEdgeColourWeightIdx = netdata.setEdgeColourWeightIdx;
  netjs.displayNetwork         = netvis.displayNetwork;
  netjs.redrawNetwork          = netvis.redrawNetwork;
  netjs.createNetworkControls  = netctrl.createNetworkControls;
  netjs.configDynamics         = netvis_dynamics.configDynamics;

  return netjs;
});
