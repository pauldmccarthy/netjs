/*
 * Create and manage a collection of widgets for controlling
 * the display of a network.
 *
 * Author: Paul McCarthy <pauldmccarthy@gmail.com>
 */
define(
  ["lib/d3", "lib/mustache", "netdata", "netvis", "netvis_dynamics"], 
  function(d3, mustache, netdata, netvis, dynamics) {

  function createNetworkControls(
    network, div, subNetDiv, subNetWidth, subNetHeight) {

    div = d3.select(div)[0][0];

    var subnet = null;

    if (subNetDiv !== null)
      subNetDiv = d3.select(subNetDiv)[0][0];

    d3.text("js/netctrl.html", function(error, template) {

      // The file netctrl.html is a mustache template.
      // Before setting up input event handling and whatnot,
      // we create a template data structure, and pass it 
      // to mustache, which renders a HTML string for us.
      var templateData = {
        thresholdValues : network.thresholdValues.map(function(val, i) {
          var tv = {};
          tv.index = i;
          tv.label = network.thresholdValueLabels[i];
          return tv;
        })
      };

      // Create some HTML from the template, 
      // and put it in the control div
      template      = mustache.render(template, templateData);
      div.innerHTML = template;

      // Now we can retrieve all of the input 
      // /elements from the rendered HTML
      var thresholdIdx     = div.querySelector("#thresholdIdx");
      var numClusters      = div.querySelector("#numClusters");
      var edgeColourIdx    = div.querySelector("#edgeColourIdx");
      var edgeColourBar    = div.querySelector("#edgeColourBar");
      var edgeWidthIdx     = div.querySelector("#edgeWidthIdx");
      var edgeWidthLegend  = div.querySelector("#edgeWidthLegend");
      var nodeColourIdx    = div.querySelector("#nodeColourIdx");
      var showSubNetwork   = div.querySelector("#showSubNetwork");
      var highlightNetwork = div.querySelector("#highlightNetwork");

      // a checkbox is created and inserted 
      // into the #showSubNetwork div only 
      // if a subNetDiv was specified
      var showSubNetworkCtrl = null;

      // get the input widgets for each threshold value
      var thresholdValues = network.thresholdValues.map(function(val, i) {
          return div.querySelector("#thresholdValue" + i);
      });

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
       * Shows/hides subnetwork visibility. 
       */
      function toggleSubNetwork() {

        // clear any previously 
        // displayed subnetwork
        if (subnet !== null) {
          netvis.clearNetwork(subnet);
          subnet = null;
        }

        // There is no subnetwork div, so
        // we cannot display a subnetwork
        if (showSubNetworkCtrl === null)
          return;

        // Subnetwork display is 
        // currently disabled
        if (!(showSubNetworkCtrl.checked))
          return;

        // There is no node selected.
        // Nothing to do here.
        if (network.selectedNode === null)
          return;

        // Extract the subnetwork for the 
        // selected node, and display it.
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

        // display the subnetwork
        netvis.displayNetwork(subnet, subNetDiv, subNetWidth, subNetHeight);
        dynamics.configDynamics(subnet);
      }

      function toggleHighlightNetwork() {

        console.log("toggleHighlightNetwork");
      }

      // Register for selected node 
      // changes on the full network
      if (subNetDiv !== null) 
          dynamics.setNodeSelectCb(network, toggleSubNetwork);

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


      /*
       * Draw a colour bar showing the edge colour range
       * Thanks: http://tributary.io/tributary/3650755/
       */
      function drawEdgeColourBar() {

        edgeColourBar.innerHTML = "";

        var d3ecb   = d3.select(edgeColourBar);
        var min     = -network.matrixAbsMaxs[network.scaleInfo.edgeColourIdx];
        var max     =  network.matrixAbsMaxs[network.scaleInfo.edgeColourIdx];
        var step    = (max - min) / 20.0;
        var points  = d3.range(min, max + 1, step);
        var fmt     = d3.format("5.2f");

        //svg canvas for colour bar (drawn below)
        var svg = d3ecb.append("svg")
          .attr("width",  150)
          .attr("height", 15);

        var minLabel = svg.append("text")
          .attr("x",            0)
          .attr("y",            15)
          .attr("font-size",    10)
          .attr("text-anchor", "left")
          .text(fmt(min));

        var minLabelLen = minLabel.node().getComputedTextLength();

        // the colour bar itself
        svg
          .selectAll("rect")
          .data(points)
          .enter()
          .append("rect")
          .attr("width",  4)
          .attr("height", 15)
          .attr("x",      function(val,i) {return minLabelLen + 1 + i*4;})
          .attr("y",      0)
          .attr("fill",   function(val) {
            return network.scaleInfo.hltEdgeColourScale(val);});

        // max value label
        svg.append("text")
          .attr("x",            minLabelLen + 4*21 + 1)
          .attr("y",            15)
          .attr("font-size",    10)
          .attr("text-anchor", "right")
          .text(fmt(max));
      }

      /*
       * Draw a legend explaining edge widths.
       */
      function drawEdgeWidthLegend() {

        edgeWidthLegend.innerHTML = "";
        var d3ewl = d3.select(edgeWidthLegend); 

        var svg = d3ewl.append("svg")
          .attr("width",  150)
          .attr("height", 100);

        var min     = network.matrixAbsMins[network.scaleInfo.edgeWidthIdx];
        var max     = network.matrixAbsMaxs[network.scaleInfo.edgeWidthIdx];
        var values  = [-max, -min, min, max];
        var fmt     = d3.format("5.2f");

        values.forEach(function(value, i) {

          svg.append("line")
            .attr("x1",           0)
            .attr("y1",           25*i + 12.5)
            .attr("x2",           100)
            .attr("y2",           25*i + 12.5)
            .attr("stroke",       "#aaaaaa")
            .attr("stroke-width", network.scaleInfo.edgeWidthScale(    value));

          svg.append("text")
            .attr("x",         101)
            .attr("y",         25*i + 12.5 + 5)
            .attr("font-size", 10)
            .attr("text-anchor", "left")
            .text(fmt(value));
        });
      }

      drawEdgeColourBar();
      drawEdgeWidthLegend();

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
          drawEdgeColourBar();
          redraw(true);
        };

      edgeWidthIdx
        .onchange = function() {
          netdata.setEdgeWidthIdx(network, parseInt(this.value));
          drawEdgeWidthLegend();
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
        toggleSubNetwork(); // recreate and reshow
        redraw(false);
      };

      thresholdValues.forEach(function(thresVal, i) {
        thresVal.onchange = function() {
          netdata.setThresholdValue(network, i, parseFloat(this.value));
          toggleSubNetwork(); // recreate and reshow
          redraw(false);
        };
      });

      // Create a show/hide button if we have been 
      // given a div in which to display a subnetwork
      if (subNetDiv !== null) {
        showSubNetworkCtrl = document.createElement("input");

        showSubNetworkCtrl.type     = "checkbox";
        showSubNetworkCtrl.checked  = false;
        showSubNetworkCtrl.onchange = toggleSubNetwork;
        showSubNetwork.appendChild(showSubNetworkCtrl);
      }      

      highlightNetwork.onchange = toggleHighlightNetwork;

      // Set initial widget values
      thresholdIdx    .selectedIndex = network.thresholdIdx;
      numClusters     .value         = network.numClusters;
      edgeColourIdx   .selectedIndex = network.scaleInfo.edgeColourIdx;
      edgeWidthIdx    .selectedIndex = network.scaleInfo.edgeWidthIdx;
      nodeColourIdx   .selectedIndex = network.scaleInfo.nodeColourIdx;
      highlightNetwork.value         = false;

      thresholdValues.forEach(function(thresVal, i) {
        thresVal.value = network.thresholdValues[i];
      });
    });
  }

  var netctrl = {}; 
  netctrl.createNetworkControls = createNetworkControls;
  return netctrl;
});

