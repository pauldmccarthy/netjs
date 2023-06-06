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
   */
  function createNetworkControls(network,
                                 networkDiv,
                                 div) {

    div = d3.select(div);

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
      var pruneDisconnected = div.select("#pruneDisconnected").node();
      var openAsSVG         = div.select("#openAsSVG")        .node();

      // get the input widgets for each threshold value
      var thresholdValues = network.thresholdValues.map(function(val, i) {
          return div.select("#thresholdValue" + i).node();
      });

      var currentThresholdValues = network.thresholdValues.map(function(val, i) {
          return div.select("#currentThresholdValue" + i).node();
      });

      var currentNumClusters = div.select("#currentNumClusters").node();

      /*
       * Refreshes the network display
       */
      function redraw() {
        netvis.redrawNetwork(network);
        dynamics.configDynamics(network);
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

        //svg canvas for colour bar (drawn below)
        edgeColourBar.node().innerHTML = "";
        var svg = edgeColourBar.append("svg")
          .attr("width",  150)
          .attr("height", 15);

        var min = -network.matrixAbsMaxs[network.scaleInfo.edgeColourIdx];
        var max =  network.matrixAbsMaxs[network.scaleInfo.edgeColourIdx];

        if (network.display.EDGE_COLOUR_MAX !== null) {
          min = -network.display.EDGE_COLOUR_MAX;
          max =  network.display.EDGE_COLOUR_MAX;
        }

        var step    = (max - min) / 20.0;
        var points  = d3.range(min, max + 1, step);
        var fmt     = d3.format("5.2f");

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

        edgeWidthLegend.node().innerHTML = "";
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
          redraw();
        };

      edgeColourIdx.onchange = function() {
          netdata.setEdgeColourIdx(network, parseInt(this.value));
          drawEdgeColourBar();
          redraw();
        };

      edgeWidthIdx.onchange = function() {
          netdata.setEdgeWidthIdx(network, parseInt(this.value));
          drawEdgeWidthLegend();
          redraw();
        };

      nodeNameIdx.onchange = function() {
        netdata.setNodeNameIdx(network, parseInt(this.value));
        redraw();
      };

      nodeColourIdx.onchange = function() {
        netdata.setNodeColourIdx(network, parseInt(this.value));
        redraw();
      };

      thresholdIdx.onchange = function() {
        netdata.setThresholdIdx(network, parseInt(this.value));

        redraw();
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
          redraw();
        };
      });

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
      pruneDisconnected .value         = network.prune;

      thresholdValues.forEach(function(thresVal, i) {
        thresVal.value                      = network.thresholdValues[i];
        currentThresholdValues[i].innerHTML = network.thresholdValues[i];
      });
    });
  }

  var netctrl = {};
  netctrl.createNetworkControls = createNetworkControls;
  return netctrl;
});
