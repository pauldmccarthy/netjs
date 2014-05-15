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

      var netctrlTable     = html.querySelector("#netctrlTable");
      var thresholdIdx     = html.querySelector("#thresholdIdx");
      var numClusters      = html.querySelector("#numClusters");
      var edgeColourIdx    = html.querySelector("#edgeColourIdx");
      var edgeWidthIdx     = html.querySelector("#edgeWidthIdx");
      var nodeColourIdx    = html.querySelector("#nodeColourIdx");
      var showSubNetwork   = html.querySelector("#showSubNetwork");

      // a button is created and inserted 
      // into the #showSubNetwork div only 
      // if a subNetDiv was specified
      var showSubNetButton = null;

      // A list of number widgets are created, 
      // one for each threshold value
      var thresVals = null;

      /*
       * Refreshes the network display, and the subnetwork
       * display, if redrawSubNet is true, and a subnetwork
       * is currently being displayed.
       */
      function redraw(redrawSubNet) {

        netvis.redrawNetwork(network);
        dynamics.configDynamics(network);

        if (redrawSubNet && subnet !== null)  {
          netvis.redrawNetwork(subnet);
          dynamics.configDynamics(subnet);
        }
      }

      /*
       * Called when the 'showSubNetwork' button
       * is clicked. Toggles subnetwork visibility.
       */
      function toggleSubNetwork() {
          
        // a subnetwork is already 
        // being displayed - hide it.
        if (subnet !== null) {

          netvis.clearNetwork(subnet);
          showSubNetButton.value = "Show";
          subnet = null;
          return;
        }
        
        // There is no node selected.
        // Nothing to do here.
        if (network.selectedNode === null) return;

        // Extract the subnetwork for the 
        // selected node, and display it.
        subnet = netdata.extractSubNetwork(network, network.selectedNode.index);
        showSubNetButton.value = "Hide";

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

        // display the subnetwork
        netvis.displayNetwork(subnet, subNetDiv, subNetWidth, subNetHeight);
        dynamics.configDynamics(subnet);
      }

      /*
       * Called when the selected node on the full network display
       * changes. Updates the subnetwork display accordingly.
       */
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

      // Register for selected node 
      // changes on the full network
      if (subNetDiv !== null) 
          dynamics.setNodeSelectCb(network, changeSubNetwork);


      // Populate the thresholdIdx, edgeColourIdx 
      // and edgeWidthIdx drop down boxes - they
      // all contain a list of network connectivity
      // matrices
      for (var i = 0; i < network.matrixLabels.length; i++) {

        var opt = document.createElement("option");
        opt.value     = "" + i;
        opt.innerHTML = network.matrixLabels[i];

        edgeColourIdx.appendChild(opt);
        edgeWidthIdx .appendChild(opt.cloneNode(true));
        thresholdIdx .appendChild(opt.cloneNode(true));
      }

      // Populate the nodeColourIdx drop down 
      // box with the node data labels
      for (var i = 0; i < network.nodeDataLabels.length; i++) {
        var opt = document.createElement("option");
        opt.value = "" + i;
        opt.innerHTML = network.nodeDataLabels[i];
        nodeColourIdx.appendChild(opt);
      }

      // Create a show/hide button if we have been 
      // given a div in which to display a subnetwork

      if (subNetDiv !== null) {
          showSubNetButton = document.createElement("input");

          showSubNetButton.type    = "button";
          showSubNetButton.value   = "Show";
          showSubNetButton.onclick = toggleSubNetwork;
          showSubNetwork.appendChild(showSubNetButton);
      }

      // Set up event handlers 
      // on all of the widgets

      numClusters
        .onchange = function() {
          netdata.setNumClusters(network, parseInt(this.value));
          redraw();
        };

      edgeColourIdx
        .onchange = function() {
          netdata.setEdgeColourIdx(network, parseInt(this.value));
          redraw(true);
        };

      edgeWidthIdx
        .onchange = function() {
          netdata.setEdgeWidthIdx(network, parseInt(this.value));
          redraw(true);
        };

      nodeColourIdx.onchange = function() {
        netData.setNodeColourIdx(network.parseInt(this.value));
        redraw();
      };

      thresholdIdx.onchange = function() {
        netdata.setThresholdIdx(network, parseInt(this.value));

        // Network thresholding has changed, meaning
        // that the subnetwork (if displayed) needs
        // to be regenerated.
        if (subnet !== null) {
          toggleSubNetwork(); // hide
          toggleSubNetwork(); // recreate and reshow
        }
        redraw(false);
      };

      // netThresVal.onchange = function() {
      //   netdata.setThresholdValue(network, 0, parseFloat(this.value));
      //   if (subnet !== null) {
      //     toggleSubNetwork(); // hide
      //     toggleSubNetwork(); // recreate and reshow
      //   }
      //   redraw(false);
      // };


      // Set initial widget values
      thresholdIdx .selectedIndex = network.thresholdIdx;
      numClusters  .value         = network.numClusters;
      edgeColourIdx.selectedIndex = network.edgeColourIdx;
      edgeWidthIdx .selectedIndex = network.edgeWidthIdx;
      nodeColourIdx.selectedIndex = network.nodeColourIdx;

      div.appendChild(html);
    });
  }

  var netctrl = {}; 
  netctrl.createNetworkControls = createNetworkControls;
  return netctrl;
});

