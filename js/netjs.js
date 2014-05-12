define(["netvis", "netdata", "netctrl"], function(netvis, netdata, netctrl) {

  var netjs = {};
  netjs.loadNetwork            = netdata.loadNetwork;
  netjs.setNumClusters         = netdata.setNumClusters;
  netjs.setEdgeWidthWeightIdx  = netdata.setEdgeWidthWeightIdx;
  netjs.setEdgeColourWeightIdx = netdata.setEdgeColourWeightIdx;
  
  netjs.displayNetwork         = netvis.displayNetwork;
  netjs.redrawNetwork          = netvis.redrawNetwork;

  netjs.createNetworkControls  = netctrl.createNetworkControls;

  return netjs;
});
