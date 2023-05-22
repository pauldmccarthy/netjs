/*
 * Create and manage a collection of widgets for controlling
 * the display of a network.
 *
 * Author: Paul McCarthy <pauldmccarthy@gmail.com>
 */
define(
  ["lib/d3", "lib/mustache", "netdata", "netvis", "netvis_dynamics"],
  function(d3, mustache, netdata, netvis, dynamics) {

  /*
   * Creates a collection of widgets for controlling the network display.
   *
   *   - highlightOn: Initial highlighted state of the network.
   *   - subnetOn:    Initial state of the sub-network.
   */
  function createNetworkControls(network,
                                 networkDiv,
                                 div,
                                 subNetDiv,
                                 subNetWidth,
                                 subNetHeight,
                                 highlightOn,
                                 subnetOn) {

    div = d3.select(div);

    var subnet = null;

    if (subNetDiv !== null) {
      subNetDiv = d3.select(subNetDiv);
    }

    d3.text("js/netctrl.html").then(function(template) {

      // The file netctrl.html is a mustache template.
      // Before setting up input event handling and whatnot,
      // we create a template data structure, and pass it
      // to mustache, which renders a HTML string for us.
      var templateData = {
        thresholdValues : network.thresholdValues.map(function(val, i) {
          var tv = {};
          tv.minVal = 0;
          tv.maxVal = d3.max(network.matrixAbsMaxs);
          tv.index = i;
          tv.label = network.thresholdValueLabels[i];
          return tv;
        })
      };

      // Create some HTML from the template,
      // and put it in the control div
      template             = mustache.render(template, templateData);
      div.node().innerHTML = template;

      // Now we can retrieve all of the input
      // elements from the rendered HTML
      var thresholdIdx      = div.select("#thresholdIdx")     .node();
      var nodeOrderIdx      = div.select("#nodeOrderIdx")     .node();
      var numClusters       = div.select("#numClusters")      .node();
      var edgeColourIdx     = div.select("#edgeColourIdx")    .node();
      var edgeColourBar     = div.select("#edgeColourBar");
      var edgeWidthIdx      = div.select("#edgeWidthIdx")     .node();
      var edgeWidthLegend   = div.select("#edgeWidthLegend");
      var nodeColourIdx     = div.select("#nodeColourIdx")    .node();
      var nodeNameIdx       = div.select("#nodeNameIdx")      .node();
      var showSubNetwork    = div.select("#showSubNetwork")   .node();
      var highlightNetwork  = div.select("#highlightNetwork") .node();
      var pruneDisconnected = div.select("#pruneDisconnected").node();
      var openAsSVG         = div.select("#openAsSVG")        .node();

      // a checkbox is created and inserted
      // into the #showSubNetwork div only
      // if a subNetDiv was specified
      var showSubNetworkCtrl = null;

      // get the input widgets for each threshold value
      var thresholdValues = network.thresholdValues.map(function(val, i) {
          return div.select("#thresholdValue" + i).node();
      });

      var currentThresholdValues = network.thresholdValues.map(function(val, i) {
          return div.select("#currentThresholdValue" + i).node();
      });

      var currentNumClusters = div.select("#currentNumClusters").node();

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
       * Shows/hides/refreshes the subnetwork display.
       *
       * Called when the 'showSubNetwork' checkbox is clicked, and
       * when the subnetwork display needs to be refreshed.
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
        subnet.display.DEF_THUMB_WIDTH      = network.display.SEL_THUMB_WIDTH;
        subnet.display.DEF_THUMB_HEIGHT     = network.display.SEL_THUMB_HEIGHT;
        subnet.display.HLT_THUMB_WIDTH      = network.display.SEL_THUMB_WIDTH;
        subnet.display.HLT_THUMB_HEIGHT     = network.display.SEL_THUMB_HEIGHT;
        subnet.display.SEL_THUMB_WIDTH      = network.display.SEL_THUMB_HEIGHT * 1.33;
        subnet.display.SEL_THUMB_HEIGHT     = network.display.SEL_THUMB_HEIGHT * 1.33;

        // share colour/scaling information between
        // the parent network and sub-network
        subnet.scaleInfo = network.scaleInfo;

        // Apply highlighting, but don't redraw, as
        // the subnetwork has not been displayed yet
        toggleHighlightNetwork(undefined, false);

        // display the subnetwork
        netvis.displayNetwork(subnet, subNetDiv, subNetWidth, subNetHeight);
        dynamics.configDynamics(subnet);
      }

      /*
       * Called when the 'highlightNetwork' checkbox is clicked.
       * Enables/disables some 'highlighted' visibility options.
       *
       * If the draw parameter is true (the default), the
       * network (and subnetwork) display will be redrawn.
       */
      function toggleHighlightNetwork(ev, draw) {

        if (typeof draw === "undefined") {
          draw = true;
        }

        // These functions only show nodes/thumbnails/labels
        // in highlighted state if they have at least one
        // adjacent edge
        function highlightThumbVis(node) {
          if (node.data.neighbours === undefined)
            return netvis.visDefaults.DEF_THUMB_VISIBILITY;
          if (node.data.neighbours.length == 0)
            return netvis.visDefaults.DEF_THUMB_VISIBILITY;
          else
            return netvis.visDefaults.HLT_THUMB_VISIBILITY;
        };

        function highlightNodeOpacity(node) {
          if (node.data.neighbours === undefined)
            return netvis.visDefaults.DEF_NODE_OPACITY;
          if (node.data.neighbours.length == 0)
            return netvis.visDefaults.DEF_NODE_OPACITY;
          else
            return netvis.visDefaults.HLT_NODE_OPACITY;
        };

        function highlightLabelWeight(node) {
          if (node.data.neighbours === undefined)
            return netvis.visDefaults.DEF_LABEL_WEIGHT;
          if (node.data.neighbours.length == 0)
            return netvis.visDefaults.DEF_LABEL_WEIGHT;
          else
            return netvis.visDefaults.HLT_LABEL_WEIGHT;
        };

        var displays = [network.display];

        if (subnet !== null) {
          displays.push(subnet.display);
        }

        for (var i = 0; i < displays.length; i++) {

          var d = displays[i];
          if (highlightNetwork.checked) {

            d.DEF_THUMB_VISIBILITY = highlightThumbVis;
            d.DEF_THUMB_WIDTH      = netvis.visDefaults.SEL_THUMB_WIDTH;
            d.DEF_THUMB_HEIGHT     = netvis.visDefaults.SEL_THUMB_HEIGHT;
            d.DEF_EDGE_COLOUR      = netvis.visDefaults.HLT_EDGE_COLOUR;
            d.DEF_EDGE_OPACITY     = netvis.visDefaults.HLT_EDGE_OPACITY;
            d.DEF_EDGE_WIDTH       = netvis.visDefaults.HLT_EDGE_WIDTH;
            d.DEF_NODE_OPACITY     = highlightNodeOpacity;
            d.DEF_LABEL_WEIGHT     = highlightLabelWeight;
          }
          else {
            d.DEF_THUMB_VISIBILITY = netvis.visDefaults.DEF_THUMB_VISIBILITY;
            d.DEF_THUMB_WIDTH      = netvis.visDefaults.DEF_THUMB_WIDTH;
            d.DEF_THUMB_HEIGHT     = netvis.visDefaults.DEF_THUMB_HEIGHT;
            d.DEF_EDGE_COLOUR      = netvis.visDefaults.DEF_EDGE_COLOUR;
            d.DEF_EDGE_OPACITY     = netvis.visDefaults.DEF_EDGE_OPACITY;
            d.DEF_EDGE_WIDTH       = netvis.visDefaults.DEF_EDGE_WIDTH;
            d.DEF_NODE_OPACITY     = netvis.visDefaults.DEF_NODE_OPACITY;
            d.DEF_LABEL_WEIGHT     = netvis.visDefaults.DEF_LABEL_WEIGHT;
          }
        }

        if (draw)
          redraw(true);
      }

      function togglePruneDisconnected() {

        var state = pruneDisconnected.checked;
        netdata.setPruningState(network, state);
        redraw(false);
      }

      /*
       * Draw a colour bar showing the edge colour range
       * Thanks: http://tributary.io/tributary/3650755/
       */
      function drawEdgeColourBar() {

        var min = -network.matrixAbsMaxs[network.scaleInfo.edgeColourIdx];
        var max =  network.matrixAbsMaxs[network.scaleInfo.edgeColourIdx];

        if (network.display.EDGE_COLOUR_MAX !== null) {
          min = -network.display.EDGE_COLOUR_MAX;
          max =  network.display.EDGE_COLOUR_MAX;
        }

        var step    = (max - min) / 20.0;
        var points  = d3.range(min, max + 1, step);
        var fmt     = d3.format("5.2f");

        //svg canvas for colour bar (drawn below)
        var svg = edgeColourBar.append("svg")
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

        var svg = edgeWidthLegend.append("svg")
          .attr("width",  150)
          .attr("height", 100);

        var min = network.matrixAbsMins[network.scaleInfo.edgeWidthIdx];
        var max = network.matrixAbsMaxs[network.scaleInfo.edgeWidthIdx];

        if (network.display.EDGE_WIDTH_MIN !== null) {
          min = network.display.EDGE_WIDTH_MIN;
        }
        if (network.display.EDGE_WIDTH_MAX !== null) {
          max = network.display.EDGE_WIDTH_MAX;
        }

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
        var opt       = document.createElement("option");
        opt.value     = "" + i;
        opt.innerHTML = network.nodeDataLabels[i];
        nodeColourIdx.appendChild(opt);
      }

      // Populate the nodeNameIdx drop down box -
      // -1 results in node indices being used
      // as the node names
      var opt       = document.createElement("option");
      opt.value     = "-1";
      opt.innerHTML = "Use node indices";
      nodeNameIdx.appendChild(opt);

      for (var i = 0; i < network.nodeNameLabels.length; i++) {
        var opt       = document.createElement("option");
        opt.value     = "" + i;
        opt.innerHTML = network.nodeNameLabels[i];
        nodeNameIdx.appendChild(opt);
      }

      // Populate the nodeOrderIdx drop down box -
      // it allows the user to choose between
      // displaying the network dendrogram, or
      // displaying the nodes in a fixed order ...
      //
      // -1 corresponds to displaying
      // the network dendrogram

      var opt       = document.createElement("option");
      opt.value     = "-1";
      opt.innerHTML = "Display network dendrogram";
      nodeOrderIdx.appendChild(opt);

      for (var i = 0; i < network.nodeOrderLabels.length; i++) {
        var opt       = document.createElement("option");
        opt.value     = "" + i;
        opt.innerHTML = network.nodeOrderLabels[i];
        nodeOrderIdx.appendChild(opt);
      }

      drawEdgeColourBar();
      drawEdgeWidthLegend();

      // Set up event handlers
      // on all of the widgets

      numClusters.onchange = function() {
          currentNumClusters.innerHTML = this.value;
          netdata.setNumClusters(network, parseInt(this.value));
          redraw(false);
        };

      edgeColourIdx.onchange = function() {
          netdata.setEdgeColourIdx(network, parseInt(this.value));
          drawEdgeColourBar();
          redraw(true);
        };

      edgeWidthIdx.onchange = function() {
          netdata.setEdgeWidthIdx(network, parseInt(this.value));
          drawEdgeWidthLegend();
          redraw(true);
        };

      nodeNameIdx.onchange = function() {
        netdata.setNodeNameIdx(network, parseInt(this.value));
        redraw(true);
      };

      nodeColourIdx.onchange = function() {
        netdata.setNodeColourIdx(network, parseInt(this.value));
        redraw(true);
      };

      thresholdIdx.onchange = function() {
        netdata.setThresholdIdx(network, parseInt(this.value));

        // Network thresholding has changed, meaning
        // that the subnetwork (if displayed) needs
        // to be regenerated.
        toggleSubNetwork(); // recreate and reshow
        redraw(false);
      };

      nodeOrderIdx.onchange = function() {

        var idx = parseInt(this.value);

        // If the user has chosen a fixed node
        // ordering, then we are not going to
        // use dendrogram information to draw
        // the network. So dendrogram-related
        // controls are enabled/disabled
        // accordingly.
        numClusters.disabled = idx > -1;

        netdata.setNodeOrderIdx(network, idx);
        redraw(true);
      };

      thresholdValues.forEach(function(thresVal, i) {
        thresVal.onchange = function() {

          currentThresholdValues[i].innerHTML = this.value;
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
      else {
        d3.select("#showSubNetworkDiv").node().innerHTML = "";
      }

      highlightNetwork .onchange = toggleHighlightNetwork;
      pruneDisconnected.onchange = togglePruneDisconnected;

      /*
       * Open the network svg in a new window
       * when the 'Open SVG' link is clicked
       */
      openAsSVG.onclick = function() {

        var div       = d3.select(networkDiv);
        var encoded = new Blob([div.html()], {type:"image/svg+xml;charset=utf-8"});
        var url     = URL.createObjectURL(encoded);
        window.open(url);

        // Must return false to stop the browser
        // from opening the <a href> url (which
        // is just a placeholder - see netctrl.html)
        return false;
      };

      // Set initial widget values
      thresholdIdx      .selectedIndex = network.thresholdIdx;
      numClusters       .value         = network.numClusters;
      currentNumClusters.innerHTML     = network.numClusters;
      edgeColourIdx     .selectedIndex = network.scaleInfo.edgeColourIdx;
      edgeWidthIdx      .selectedIndex = network.scaleInfo.edgeWidthIdx;
      nodeColourIdx     .selectedIndex = network.scaleInfo.nodeColourIdx;
      nodeNameIdx       .selectedIndex = network.nodeNameIdx + 1;
      nodeOrderIdx      .selectedIndex = network.nodeOrderIdx + 1;
      highlightNetwork  .value         = false;
      pruneDisconnected .value         = network.prune;

      thresholdValues.forEach(function(thresVal, i) {
        thresVal.value                      = network.thresholdValues[i];
        currentThresholdValues[i].innerHTML = network.thresholdValues[i];
      });

      if (highlightOn) {
        highlightNetwork.checked = true;
        toggleHighlightNetwork();
      }

      if (subnetOn && (subNetDiv !== null)) {
        showSubNetworkCtrl.checked = true;
        toggleSubNetwork();
      }
    });
  }

  var netctrl = {};
  netctrl.createNetworkControls = createNetworkControls;
  return netctrl;
});
