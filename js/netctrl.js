/*
 * Create and manage a collection of widgets for controlling
 * the display of a network.
 *
 * Author: Paul McCarthy <pauldmccarthy@gmail.com>
 */
define(
  ["lib/d3", "lib/mustache", "lib/queue", "netdata", "netvis", "netvis_dynamics"], 
  function(d3, mustache, queue, netdata, netvis, dynamics) {

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
      // elements from the rendered HTML
      var thresholdIdx      = div.querySelector("#thresholdIdx");
      var nodeOrderIdx      = div.querySelector("#nodeOrderIdx");
      var numClusters       = div.querySelector("#numClusters");
      var edgeColourIdx     = div.querySelector("#edgeColourIdx");
      var edgeColourBar     = div.querySelector("#edgeColourBar");
      var edgeWidthIdx      = div.querySelector("#edgeWidthIdx");
      var edgeWidthLegend   = div.querySelector("#edgeWidthLegend");
      var nodeColourIdx     = div.querySelector("#nodeColourIdx");
      var nodeNameIdx       = div.querySelector("#nodeNameIdx");
      var showSubNetwork    = div.querySelector("#showSubNetwork");
      var highlightNetwork  = div.querySelector("#highlightNetwork");
      var pruneDisconnected = div.querySelector("#pruneDisconnected");
      var openAsSVG         = div.querySelector("#openAsSVG");

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
        var highlightThumbVis = function(node) {
          if (node.neighbours.length == 0)
            return netvis.visDefaults.DEF_THUMB_VISIBILITY;
          else
            return netvis.visDefaults.HLT_THUMB_VISIBILITY;
        };

        var highlightNodeOpacity = function(node) {
          if (node.neighbours.length == 0)
            return netvis.visDefaults.DEF_NODE_OPACITY;
          else
            return netvis.visDefaults.HLT_NODE_OPACITY;
        }; 

        var highlightLabelWeight = function(node) {
          if (node.neighbours.length == 0)
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

        edgeColourBar.innerHTML = "";

        var min     = -network.matrixAbsMaxs[network.scaleInfo.edgeColourIdx];
        var max     =  network.matrixAbsMaxs[network.scaleInfo.edgeColourIdx];

        if (network.display.EDGE_COLOUR_MAX !== null) {
          min = -network.display.EDGE_COLOUR_MAX; 
          max =  network.display.EDGE_COLOUR_MAX;
        }

        var d3ecb   = d3.select(edgeColourBar);
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

      numClusters
        .onchange = function() {
          netdata.setNumClusters(network, parseInt(this.value));
          redraw(false);
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

      highlightNetwork .onchange = toggleHighlightNetwork;
      pruneDisconnected.onchange = togglePruneDisconnected;

      /*
       * Open the network svg in a new window 
       * when the 'Open SVG' link is clicked
       */
      openAsSVG.onclick = function() {

        // Thanks http://stackoverflow.com/a/26595628
        var b64encode = function (input) {
          var uInt8Array = new Uint8Array(input),
              i = uInt8Array.length;
          var biStr = []; //new Array(i);
          while (i--) { biStr[i] = String.fromCharCode(uInt8Array[i]);  }
          var base64 = window.btoa(biStr.join(''));
          return base64;
        }; 
 

        var div       = d3.select(networkDiv);
        var zerofmt   = d3.format("04d");
        var svgWindow = window.open();
        var q         = queue();
        var imgSelect = div.selectAll("image");
        var imgElems  = [];

        // This is a bit fiddly, because the network svg
        // has been created using links to the thumbnails.
        // In order to create a standalone svg scene, we
        // need to download all of those thumbnails and
        // insert them into the svg, in place of the
        // original links.

        // Function which downloads the thumbnail
        // for the specified node.
        var getthumb = function(nodeIdx, callback) {

          var url = network.thumbUrl + "/" + zerofmt(nodeIdx) + ".png";
          d3.xhr(url)
            .mimeType("image/png")
            .responseType("arraybuffer")
            .get(callback);
        };

        // Queue a request to download all the thumbnails
        if (network.thumbUrl !== null) {
          for (var i = 0; i < network.nodes.length; i++) {
            
            var imgElem = imgSelect.filter(".node-" + i);

            if (imgElem !== undefined) {
              imgElems.push(imgElem);
              q = q.defer(getthumb, i);
            }
          }
        }

        // When all the thumbs have been downloaded,
        q.awaitAll(function(error, thumbs) {
          
          thumbs.map(function(thumb, idx) {

            // b64 encode them, and insert 
            // them into the svg
            var encoded = b64encode(thumb.response);
            imgElems[idx].attr("xlink:href", "data:image/png+xml;base64,\n" + encoded);

          });

          // Load the full SVG in a new window
          var encoded = btoa(div.html());
          var url     = "data:image/svg+xml;base64,\n" + encoded;

          svgWindow.location = url;
        });
        
        return false;
      };

      // Set initial widget values
      thresholdIdx     .selectedIndex = network.thresholdIdx;
      numClusters      .value         = network.numClusters;
      edgeColourIdx    .selectedIndex = network.scaleInfo.edgeColourIdx;
      edgeWidthIdx     .selectedIndex = network.scaleInfo.edgeWidthIdx;
      nodeColourIdx    .selectedIndex = network.scaleInfo.nodeColourIdx;
      nodeNameIdx      .selectedIndex = network.nodeNameIdx + 1;
      nodeOrderIdx     .selectedIndex = network.nodeOrderIdx + 1;
      highlightNetwork .value         = false;
      pruneDisconnected.value         = network.prune;

      thresholdValues.forEach(function(thresVal, i) {
        thresVal.value = network.thresholdValues[i];
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

