
define(
  ["lib/d3", "netdata", "netvis", "netvis_dynamics", "netvis_local"], 
  function(d3, netdata, netvis, dynamics, nvLocal) {

  function createNetworkControls(
    network, div, subNetDiv, subNetWidth, subNetHeight) {

    div = d3.select(div)[0][0];

    if (subNetDiv !== null)
      subNetDiv = d3.select(subNetDiv)[0][0];

    d3.html("/js/netctrl.html", function(error, html) {

      var numClustRange    = html.querySelector("#numClusts");
      var edgeColourScale  = html.querySelector("#edgeColourScale");
      var edgeWidthScale   = html.querySelector("#edgeWidthScale");
      var showSubNetButton = html.querySelector("#showSubNetwork");

      for (var i = 0; i < network.weightLabels.length; i++) {

        var opt = document.createElement("option");
        opt.value     = "" + i;
        opt.innerHTML = network.weightLabels[i];

        edgeColourScale.appendChild(opt);
        edgeWidthScale .appendChild(opt.cloneNode(true));
      }

      edgeColourScale.selectedIndex = network.edgeColourWeightIdx;
      edgeWidthScale .selectedIndex = network.edgeWidthWeightIdx;

      numClustRange
        .onchange = function() {
          netdata.setNumClusters(network, parseInt(this.value));
          netvis.redrawNetwork(network);
          dynamics.configDynamics(network);
          console.log(network);
        };

      edgeColourScale
        .onchange = function() {
          netdata.setEdgeColourWeightIdx(network, parseInt(this.value));
          netvis.redrawNetwork(network);
          dynamics.configDynamics(network);
        };

      edgeWidthScale
        .onchange = function() {
          netdata.setEdgeWidthWeightIdx(network, parseInt(this.value));
          netvis.redrawNetwork(network)
          dynamics.configDynamics(network);
        };

      showSubNetButton
        .onclick = function() {

          if (network.selectedNode === null) return;
          
          var subnet = netdata.extractSubNetwork(network, network.selectedNode.index);
          nvLocal.displayLocalNetwork(
            subnet, subNetDiv, subNetWidth, subNetHeight);
        };
      

      div.appendChild(html);
    });
  }

  var netctrl = {}; 
  netctrl.createNetworkControls = createNetworkControls;
  return netctrl;
});
