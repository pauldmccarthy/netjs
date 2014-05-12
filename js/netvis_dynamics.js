define(["lib/d3", "netvis"], function(d3, netvis) {

  function configNodeDynamics(network) {

    /*
     * Shows or hides the network for the given node.
     * This includes the edges on the node and the 
     * thumbnails of the node neighbours.
     */
    function showNodeNetwork(node, show) {

      var pathElems     = node.pathElems;
      var paths         = node.paths;
      var nbrElems      = node.nbrElems;
      var nbrLabelElems = node.nbrLabelElems;
      var nbrThumbElems = node.nbrThumbElems;

      var nodeOpacity = netvis.DEF_NODE_OPACITY;
      var font        = netvis.DEF_LABEL_FONT;
      var fontWeight  = netvis.DEF_LABEL_WEIGHT;
      var thumbVis    = "hidden";
      var thumbWidth  = netvis.HLT_THUMB_WIDTH;
      var thumbHeight = netvis.HLT_THUMB_HEIGHT;

      var edgeOpacity = netvis.DEF_EDGE_OPACITY;
      var edgeWidth   = netvis.DEF_EDGE_WIDTH;
      var edgeColour  = function(path) {
        return network.defEdgeColourScale(path.edge.weights[0]);};
      
      if (show) {

        nodeOpacity = netvis.HLT_NODE_OPACITY;
        font        = netvis.HLT_LABEL_FONT;
        fontWeight  = netvis.HLT_LABEL_WEIGHT;
        thumbVis    = "visible";
        
        edgeOpacity = netvis.HLT_EDGE_OPACITY;
        edgeWidth   = function(path) {
          return network.edgeWidthScale(path.edge.weights[0]);}
        edgeColour  = function(path) {
          return network.hltEdgeColourScale(path.edge.weights[0]);};
      }
     
      nbrElems
        .attr("opacity",     nodeOpacity);

      nbrLabelElems
        .attr("opacity",     nodeOpacity)
        .attr("font-family", font)
        .attr("font-weight", fontWeight);

      nbrThumbElems
        .attr("visibility", thumbVis)
        .attr("width",      thumbWidth)
        .attr("height",     thumbHeight);
      
      pathElems
        .data(paths)
        .attr("stroke-width", edgeWidth)
        .attr("stroke",       edgeColour)
        .attr("opacity",      edgeOpacity)
        .each(function() {this.parentNode.appendChild(this)});
    }

    /*
     * Show or hide the given node, label, and thumbnail. The 
     * 'show' parameter may be "highlight", in which case the 
     * node is highlighted, "select", in which case the node 
     * is highlighted in a slightly more emphatic manner, or 
     * any other value, in which case the node thumbnail is 
     * hidden, and circle/label set to a default style.
     */
    function showNode(node, show) {

      var opacity     = netvis.DEF_NODE_OPACITY;
      var font        = netvis.DEF_LABEL_FONT;
      var fontWeight  = netvis.DEF_LABEL_WEIGHT;
      var fontSize    = netvis.DEF_LABEL_SIZE;
      var nodeSize    = netvis.DEF_NODE_SIZE;
      var thumbVis    = "hidden";
      var thumbWidth  = 0;
      var thumbHeight = 0;

      if (show === "highlight") {
        opacity     = netvis.HLT_NODE_OPACITY;
        font        = netvis.DEF_LABEL_FONT;
        fontWeight  = netvis.HLT_LABEL_WEIGHT; 
        fontSize    = netvis.DEF_LABEL_SIZE;
        nodeSize    = netvis.DEF_NODE_SIZE;
        thumbVis    = "visible";
        thumbWidth  = netvis.HLT_THUMB_WIDTH;
        thumbHeight = netvis.HLT_THUMB_HEIGHT;
      }
      else if (show === "select") {
        opacity     = netvis.SEL_NODE_OPACITY;
        font        = netvis.SEL_LABEL_FONT;
        fontWeight  = netvis.SEL_LABEL_WEIGHT; 
        fontSize    = netvis.SEL_LABEL_SIZE;
        nodeSize    = netvis.SEL_NODE_SIZE;
        thumbVis    = "visible";
        thumbWidth  = netvis.SEL_THUMB_WIDTH;
        thumbHeight = netvis.SEL_THUMB_HEIGHT;
      }

      node.labelElem.attr("opacity",     opacity);
      node.labelElem.attr("font-family", font);
      node.labelElem.attr("font-weight", fontWeight);
      node.labelElem.attr("font-size",   fontSize);

      node.nodeElem .attr("r",           nodeSize);
      node.nodeElem .attr("opacity",     opacity);

      node.thumbElem.attr("visibility",  thumbVis);
      node.thumbElem.attr("width",       thumbWidth);
      node.thumbElem.attr("height",      thumbHeight);

      // move the highlighted node thumbnail element
      // to the end of its parents' list of children,
      // so it is displayed on top
      var thumbNode = node.thumbElem.node();
      thumbNode.parentNode.appendChild(thumbNode);
    }

    /*
     * Called when a node, its label or thumbnail is clicked.
     * Selects that node, which involves highlighting the node 
     * and its immediate network. Or if the node was already
     * selected, it is deselected.
     */
    function mouseClickNode(node) {

      var oldSelection = network.selectedNode;

      // Situation the first. No other node 
      // was selected. Select this node.
      if (oldSelection === null) {
        network.selectedNode = node;

        showNode(       node, "select");
        showNodeNetwork(node,  true);
      }
      
      // Situation the second. This node was
      // already selected. Deselect it.
      else if (oldSelection === node) {
        network.selectedNode = null;

        showNode(       node, false);
        showNodeNetwork(node, false); 
      }

      // Situation the third. Another node 
      // was selected. Deselect that node,
      // and select this one.
      else {
        network.selectedNode = node;

        showNode(       oldSelection, false);
        showNodeNetwork(oldSelection, false);
        showNode(       node,        "select");
        showNodeNetwork(node,         true);
      }
    }
    
    /*
     * Called when the mouse moves over a node. 
     * Highlights that node.
     */
    function mouseOverNode(node) {
      showNode(node, "select");
    }

    /*
     * Called when the mouse moves off a node.
     * Removes any highlighting that was applied
     * by the mouseOverNode function.
     */
    function mouseOutNode(node) {

      // Situation the first. The node 
      // is selected. Don't touch it.
      if (network.selectedNode === node) {
        return;
      }

      // Situation the second. The node is a 
      // neighbour of the selected node. Return 
      // it back to a 'highlight' state.
      if (network.selectedNode !== null && 
          (network.selectedNode.neighbours.indexOf(node) > -1)) {
        showNode(node, "highlight");
      }

      // Situation the third. The node 
      // is just a node. Hide it.
      else {
        showNode(node, false);
      }
    }

    var svg           = network.svg;
    var radius        = network.radius;
    var svgNodes      = network.svgNodes;
    var svgNodeLabels = network.svgNodeLabels;
    var svgThumbnails = network.svgThumbnails;
    var svgEdges      = network.svgEdges;

    // This variable is used to keep track 
    // of the currently selected node. 
    if (!network.selectedNode)
      network.selectedNode = null;

    // Here, we pre-emptively run CSS selector lookups 
    // so they don't have to be done on every mouse event.
    // Makes the interaction a bit more snappy.
    network.nodes.forEach(function(node) {

      node.pathElems     = d3.selectAll(".edge-"          + node.index);
      node.nodeElem      = d3.select(   "circle.node-"    + node.index);
      node.labelElem     = d3.select(   "text.node-"      + node.index);
      node.thumbElem     = d3.select(   "image.node-"     + node.index);
      node.nbrElems      = d3.selectAll("circle.nodenbr-" + node.index);
      node.nbrLabelElems = d3.selectAll("text.nodenbr-"   + node.index);
      node.nbrThumbElems = d3.selectAll("image.nodenbr-"  + node.index);
    });

    /*
     * Shows or hides the network for the given node.
     * This includes the edges on the node and the 
     * thumbnails of the node neighbours.
     */
    function showNodeNetwork(node, show) {

      var pathElems     = node.pathElems;
      var paths         = node.paths;
      var nbrElems      = node.nbrElems;
      var nbrLabelElems = node.nbrLabelElems;
      var nbrThumbElems = node.nbrThumbElems;

      var nodeOpacity = netvis.DEF_NODE_OPACITY;
      var font        = netvis.DEF_LABEL_FONT;
      var fontWeight  = netvis.DEF_LABEL_WEIGHT;
      var thumbVis    = "hidden";
      var thumbWidth  = netvis.HLT_THUMB_WIDTH;
      var thumbHeight = netvis.HLT_THUMB_HEIGHT;

      var edgeOpacity = netvis.DEF_EDGE_OPACITY;
      var edgeWidth   = netvis.DEF_EDGE_WIDTH;
      var edgeColour  = function(path) {
        return network.defEdgeColourScale(path.edge.weights[0]);};
      
      if (show) {

        nodeOpacity = netvis.HLT_NODE_OPACITY;
        font        = netvis.HLT_LABEL_FONT;
        fontWeight  = netvis.HLT_LABEL_WEIGHT;
        thumbVis    = "visible";
        
        edgeOpacity = netvis.HLT_EDGE_OPACITY;
        edgeWidth   = function(path) {
          return network.edgeWidthScale(path.edge.weights[0]);}
        edgeColour  = function(path) {
          return network.hltEdgeColourScale(path.edge.weights[0]);};
      }
     
      nbrElems
        .attr("opacity",     nodeOpacity);

      nbrLabelElems
        .attr("opacity",     nodeOpacity)
        .attr("font-family", font)
        .attr("font-weight", fontWeight);

      nbrThumbElems
        .attr("visibility", thumbVis)
        .attr("width",      thumbWidth)
        .attr("height",     thumbHeight);
      
      pathElems
        .data(paths)
        .attr("stroke-width", edgeWidth)
        .attr("stroke",       edgeColour)
        .attr("opacity",      edgeOpacity)
        .each(function() {this.parentNode.appendChild(this)});
    }

    /*
     * Show or hide the given node, label, and thumbnail. The 
     * 'show' parameter may be "highlight", in which case the 
     * node is highlighted, "select", in which case the node 
     * is highlighted in a slightly more emphatic manner, or 
     * any other value, in which case the node thumbnail is 
     * hidden, and circle/label set to a default style.
     */
    function showNode(node, show) {

      var opacity     = netvis.DEF_NODE_OPACITY;
      var font        = netvis.DEF_LABEL_FONT;
      var fontWeight  = netvis.DEF_LABEL_WEIGHT;
      var fontSize    = netvis.DEF_LABEL_SIZE;
      var nodeSize    = netvis.DEF_NODE_SIZE;
      var thumbVis    = "hidden";
      var thumbWidth  = 0;
      var thumbHeight = 0;

      if (show === "highlight") {
        opacity     = netvis.HLT_NODE_OPACITY;
        font        = netvis.DEF_LABEL_FONT;
        fontWeight  = netvis.HLT_LABEL_WEIGHT; 
        fontSize    = netvis.DEF_LABEL_SIZE;
        nodeSize    = netvis.DEF_NODE_SIZE;
        thumbVis    = "visible";
        thumbWidth  = netvis.HLT_THUMB_WIDTH;
        thumbHeight = netvis.HLT_THUMB_HEIGHT;
      }
      else if (show === "select") {
        opacity     = netvis.SEL_NODE_OPACITY;
        font        = netvis.SEL_LABEL_FONT;
        fontWeight  = netvis.SEL_LABEL_WEIGHT; 
        fontSize    = netvis.SEL_LABEL_SIZE;
        nodeSize    = netvis.SEL_NODE_SIZE;
        thumbVis    = "visible";
        thumbWidth  = netvis.SEL_THUMB_WIDTH;
        thumbHeight = netvis.SEL_THUMB_HEIGHT;
      }

      node.labelElem.attr("opacity",     opacity);
      node.labelElem.attr("font-family", font);
      node.labelElem.attr("font-weight", fontWeight);
      node.labelElem.attr("font-size",   fontSize);

      node.nodeElem .attr("r",           nodeSize);
      node.nodeElem .attr("opacity",     opacity);

      node.thumbElem.attr("visibility",  thumbVis);
      node.thumbElem.attr("width",       thumbWidth);
      node.thumbElem.attr("height",      thumbHeight);

      // move the highlighted node thumbnail element
      // to the end of its parents' list of children,
      // so it is displayed on top
      var thumbNode = node.thumbElem.node();
      thumbNode.parentNode.appendChild(thumbNode);
    }

    /*
     * Called when a node, its label or thumbnail is clicked.
     * Selects that node, which involves highlighting the node 
     * and its immediate network. Or if the node was already
     * selected, it is deselected.
     */
    function mouseClickNode(node) {

      var oldSelection = network.selectedNode;

      // Situation the first. No other node 
      // was selected. Select this node.
      if (oldSelection === null) {
        network.selectedNode = node;

        showNode(       node, "select");
        showNodeNetwork(node,  true);
      }
      
      // Situation the second. This node was
      // already selected. Deselect it.
      else if (oldSelection === node) {
        network.selectedNode = null;

        showNode(       node, false);
        showNodeNetwork(node, false); 
      }

      // Situation the third. Another node 
      // was selected. Deselect that node,
      // and select this one.
      else {
        network.selectedNode = node;

        showNode(       oldSelection, false);
        showNodeNetwork(oldSelection, false);
        showNode(       node,        "select");
        showNodeNetwork(node,         true);
      }
    }
    
    /*
     * Called when the mouse moves over a node. 
     * Highlights that node.
     */
    function mouseOverNode(node) {
      showNode(node, "select");
    }

    /*
     * Called when the mouse moves off a node.
     * Removes any highlighting that was applied
     * by the mouseOverNode function.
     */
    function mouseOutNode(node) {

      // Situation the first. The node 
      // is selected. Don't touch it.
      if (network.selectedNode === node) {
        return;
      }

      // Situation the second. The node is a 
      // neighbour of the selected node. Return 
      // it back to a 'highlight' state.
      if (network.selectedNode !== null && 
          (network.selectedNode.neighbours.indexOf(node) > -1)) {
        showNode(node, "highlight");
      }

      // Situation the third. The node 
      // is just a node. Hide it.
      else {
        showNode(node, false);
      }
    }


    // configure mouse event callbacks on 
    // node circles, labels, and thumbnails.
    svgNodes
      .selectAll("circle")
      .on("mouseover", mouseOverNode)
      .on("mouseout",  mouseOutNode)
      .on("click",     mouseClickNode);
    svgNodeLabels
      .selectAll("text")
      .on("mouseover", mouseOverNode)
      .on("mouseout",  mouseOutNode)
      .on("click",     mouseClickNode);
    svgThumbnails
      .selectAll("image")
      .on("mouseover", mouseOverNode)
      .on("mouseout",  mouseOutNode)
      .on("click",     mouseClickNode);

    // initialise the selection display, if 
    // a node has previously been selected
    if (network.selectedNode != null) {
      showNode(       network.selectedNode, "select");
      showNodeNetwork(network.selectedNode, true);
    }
  }

  function configEdgeDynamics(network) {

    var svg           = network.svg;
    var radius        = network.radius;
    var svgNodes      = network.svgNodes;
    var svgNodeLabels = network.svgNodeLabels;
    var svgThumbnails = network.svgThumbnails;
    var svgEdges      = network.svgEdges;

    // Pop-up tooltip on edge paths, which displays
    // edge weights on mouse over.
    // thanks: http://stackoverflow.com/questions/16256454/\
    // d3-js-position-tooltips-using-element-position-not-mouse-position

    var edgeLabelElem = d3.select("body div#edgeWeightPopup");
    if (edgeLabelElem.empty()) {
      edgeLabelElem = d3.select("body")
        .append("div")
        .attr( "id",             "edgeWeightPopup")
        .style("position",       "absolute")
        .style("padding",        "3px")
        .style("text-align",     "center")
        .style("background",     "#99cc66")
        .style("border-radius",  "5px")
        .style("pointer-events", "none")
        .style("opacity",        "0")
    }
    /*
     * Called when the mouse moves over a path in the network
     * of the selected node. Pops up a tooltip displaying the 
     * edge weights.
     */
    function mouseOverPath(path) {

      if (network.selectedNode === null) return;
      if (network.selectedNode !== path.edge.i &&
          network.selectedNode !== path.edge.j)  return;

      var label = path.edge.i.name + " - " + 
                  path.edge.j.name + "<br>";
      for (var i = 0; i < path.edge.weights.length; i++) {
        label = label + network.weightLabels[i] + ": " 
                      + path.edge.weights[i] + "<br>";
      }

      edgeLabelElem
        .html(label)
        .style("left", (d3.event.pageX) + "px")
        .style("top",  (d3.event.pageY) + "px")
        .transition()
        .duration(50)
        .style("opacity", 0.7)
    }

    /*
     * Hides the edge tooltip, if it is being displayed.
     */
    function mouseOutPath(path) {
      edgeLabelElem
        .transition()
        .duration(50)
        .style("opacity", 0);
    }


    // configure events on edges
    svgEdges.selectAll("path")
      .on("mouseover", mouseOverPath);
    svgEdges.selectAll("path")
      .on("mouseout",  mouseOutPath);
  }

  /*
   *
   */
  function configNetworkDynamics(network) {

    var svg           = network.svg;
    var radius        = network.radius;
    var svgNodes      = network.svgNodes;
    var svgNodeLabels = network.svgNodeLabels;
    var svgThumbnails = network.svgThumbnails;
    var svgEdges      = network.svgEdges;

    // The network may be rotated by dragging the mouse up/down
    var mouseDownPos   = {}
    var parentGroup = svg.select("#networkParentGroup");

    mouseDownPos.x       = 0.0;
    mouseDownPos.y       = 0.0;
    mouseDownPos.angle   = 0.0;
    mouseDownPos.origRot = 0.0;
    mouseDownPos.newRot  = 0.0;
    mouseDownPos.down    = false;

    /*
     * When the mouse is clicked on the svg canvas, its x/y location,
     * and the current network rotation, are stored in an object,
     * and the mouseDownPos variable pointed towards it.
     */
    function mouseDownCanvas() {
      
      var mouseCoords = d3.mouse(this);

      var x = mouseCoords[0] - network.width  / 2.0;
      var y = mouseCoords[1] - network.height / 2.0;
      
      mouseDownPos.down  = true;
      mouseDownPos.x     = x;
      mouseDownPos.y     = y;
      mouseDownPos.angle = (Math.atan2(y, x) * 180.0/Math.PI) % 360;

      d3.event.preventDefault();
    }

    /*
     * Clears the mouseDownPos reference.
     */
    function mouseUpCanvas() {
      mouseDownPos.down    = false;
      mouseDownPos.origRot = mouseDownPos.newRot;
    }

    /*
     * When the mouse is dragged across the canvas, the network
     * is rotated according to the distance between the original
     * mouse click location, and the current mouse location.
     */
    function mouseMoveCanvas() {

      if (mouseDownPos.down === false) return;

      var mouseCoords = d3.mouse(this);

      var newX     = mouseCoords[0] - network.width  / 2.0;
      var newY     = mouseCoords[1] - network.height / 2.0;
      var oldX     = mouseDownPos.x;
      var oldY     = mouseDownPos.y;
      var oldRot   = mouseDownPos.origRot;
      var oldAngle = mouseDownPos.angle;
      var newAngle = Math.atan2(newY, newX) * 180.0/Math.PI;
      var newRot   = (newAngle - oldAngle + oldRot) % 360;

      mouseDownPos.newRot = newRot;

      parentGroup
        .attr("transform", "translate(" + radius + "," + radius + ")" + 
                           "rotate(" + newRot + ")");
    }

    svg
      .on("mousedown", mouseDownCanvas)
      .on("mousemove", mouseMoveCanvas);

    // register mouse-up with the top level window, so
    // the drag behaviour is disabled even if the mouse
    // is released outside of tge canvas
    d3.select(window)
      .on("mouseup",   mouseUpCanvas)
    
  }

  /*
   * Configures mouse-based interaction with the full 
   * connectivity network. When the mouse moves over a node 
   * or its label, it is highlighted and its thumbnail 
   * displayed. When a mouse click occurs on a node, its 
   * label or thumbnail, it is 'selected'.  The edges of
   * that node, and its neighbour nodes are then highlighted,
   * and remain so until the node is clicked again, or 
   * another node is clicked upon.
   */
  function configDynamics(network) {

    var svg           = network.svg;
    var radius        = network.radius;
    var svgNodes      = network.svgNodes;
    var svgNodeLabels = network.svgNodeLabels;
    var svgThumbnails = network.svgThumbnails;
    var svgEdges      = network.svgEdges;

    // This variable is used to keep track 
    // of the currently selected node. 
    if (!network.selectedNode)
      network.selectedNode = null;

    // Here, we pre-emptively run CSS selector lookups 
    // so they don't have to be done on every mouse event.
    // Makes the interaction a bit more snappy.
    network.nodes.forEach(function(node) {

      node.pathElems     = d3.selectAll(".edge-"          + node.index);
      node.nodeElem      = d3.select(   "circle.node-"    + node.index);
      node.labelElem     = d3.select(   "text.node-"      + node.index);
      node.thumbElem     = d3.select(   "image.node-"     + node.index);
      node.nbrElems      = d3.selectAll("circle.nodenbr-" + node.index);
      node.nbrLabelElems = d3.selectAll("text.nodenbr-"   + node.index);
      node.nbrThumbElems = d3.selectAll("image.nodenbr-"  + node.index);
    });

    configNodeDynamics(   network);
    configEdgeDynamics(   network);
    configNetworkDynamics(network);
  }

  var netvis_dynamics = {};
  netvis_dynamics.configDynamics = configDynamics;
  return netvis_dynamics;
});
