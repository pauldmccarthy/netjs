/*
 *
 */
define(
  ["lib/d3", "netdata", "netvis", "netvis_dynamics"], 
  function(d3, netdata, netvis, dynamics) {

  function createNetworkControls(
    network, div, subNetDiv, subNetWidth, subNetHeight) {

    div = d3.select(div)[0][0];

    var subnet = null;

    if (subNetDiv !== null)
      subNetDiv = d3.select(subNetDiv)[0][0];

    d3.html("js/netctrl.html", function(error, html) {

      var netThreshold     = html.querySelector("#netThreshold");
      var netThresVal      = html.querySelector("#netThresVal");
      var numClustRange    = html.querySelector("#numClusts");
      var edgeColourScale  = html.querySelector("#edgeColourScale");
      var edgeWidthScale   = html.querySelector("#edgeWidthScale");
      var nodeColour       = html.querySelector("#nodeColour");
      var showSubNetButton = html.querySelector("#showSubNetwork");

      function changeSubNetwork(node) {

        // Situation the first. Subnetwork is 
        // not being displayed. Do nothing.
        if (subnet === null) 
          return;

        // Situation the second. A subnetwork
        // is being displayed, and the selected
        // node has been cleared. Clear the 
        // subnetwork display
        if (node === null && subnet !== null)
          toggleSubNetwork();

        // Situation the third. A subnetwork 
        // is being displayed, and a new node
        // has been selected. Show the new
        // subnetwork.
        else {
          toggleSubNetwork(); // hide
          toggleSubNetwork(); // redraw
        }
      }
      dynamics.setNodeSelectCb(network, changeSubNetwork);

      function toggleSubNetwork() {

        if (subnet !== null) {

          netvis.clearNetwork(subnet);
          showSubNetButton.value = "Show";
          subnet = null;
          return;
        }

        if (network.selectedNode === null) return;
        
        showSubNetButton.value = "Hide";

        subnet = netdata.extractSubNetwork(network, network.selectedNode.index);

        // tweak the sub-network display a little bit
        subnet.display = {};
        subnet.display.DEF_THUMB_VISIBILITY = "visible";
        subnet.display.DEF_NODE_OPACITY     = 1.0;
        subnet.display.DEF_EDGE_WIDTH       = "scale";
        subnet.display.DEF_THUMB_WIDTH      = 91  / 2.0;
        subnet.display.DEF_THUMB_HEIGHT     = 109 / 2.0;
        subnet.display.HLT_THUMB_WIDTH      = 91  / 2.0;
        subnet.display.HLT_THUMB_HEIGHT     = 109 / 2.0;
        subnet.display.SEL_THUMB_WIDTH      = 91  / 1.5;
        subnet.display.SEL_THUMB_HEIGHT     = 109 / 1.5;

        // share colour/scaling information between 
        // the parent network and sub-network
        subnet.scaleInfo = network.scaleInfo;

        netvis.displayNetwork(subnet, subNetDiv, subNetWidth, subNetHeight);

        dynamics.configDynamics(subnet);
      }

      function redraw(redrawSubNet) {
        netvis.redrawNetwork(network);
        dynamics.configDynamics(network);
        if (redrawSubNet && subnet !== null)  {
          netvis.redrawNetwork(subnet);
          dynamics.configDynamics(subnet);
        }
      }

      for (var i = 0; i < network.matrixLabels.length; i++) {

        var opt = document.createElement("option");
        opt.value     = "" + i;
        opt.innerHTML = network.matrixLabels[i];

        edgeColourScale.appendChild(opt);
        edgeWidthScale .appendChild(opt.cloneNode(true));
        netThreshold   .appendChild(opt.cloneNode(true));
      }

      edgeColourScale.selectedIndex = network.edgeColourIdx;
      edgeWidthScale .selectedIndex = network.edgeWidthIdx;
      netThreshold   .selectedIndex = network.thresholdIdx;

      numClustRange
        .onchange = function() {
          netdata.setNumClusters(network, parseInt(this.value));
          redraw();
        };

      edgeColourScale
        .onchange = function() {
          netdata.setEdgeColourIdx(network, parseInt(this.value));
          redraw(true);
        };

      edgeWidthScale
        .onchange = function() {
          netdata.setEdgeWidthIdx(network, parseInt(this.value));
          redraw(true);
        };

      netThreshold.onchange = function() {
        netdata.setThresholdMatrix(network, parseInt(this.value));
        if (subnet !== null) {
          toggleSubNetwork(); // hide
          toggleSubNetwork(); // recreate and reshow
        }

        redraw(false);
      };

      netThresVal.onchange = function() {
        netdata.setThresholdValue(network, 0, parseFloat(this.value));
        if (subnet !== null) {
          toggleSubNetwork(); // hide
          toggleSubNetwork(); // recreate and reshow
        }
        redraw(false);
      };

      showSubNetButton.onclick = toggleSubNetwork;

      div.appendChild(html);
    });
  }

  var netctrl = {}; 
  netctrl.createNetworkControls = createNetworkControls;
  return netctrl;
});

