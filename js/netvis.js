/*
 * Display the dendrogram and connectivity of a 
 * of a nets_hierarchy call using D3.js.
 * 
 * This file will make more sense if read from bottom to top.
 *
 * Author: Paul McCarthy <pauldmccarthy@gmail.com>
 *
 * Citations: 
 *   - http://d3js.org/
 *   - http://bl.ocks.org/mbostock/7607999
 */
define(["lib/d3"], function(d3) {

  /* 
   * Various constants for configuring how nodes,
   * labels, thumbnails, and edges are displayed
   * normally (DEF), when highlighted (HLT),
   * and when selected (SEL).
   */
  var DEF_LABEL_SIZE   = 10;
  var SEL_LABEL_SIZE   = 16;
  var DEF_LABEL_WEIGHT = "normal";
  var HLT_LABEL_WEIGHT = "bold";
  var SEL_LABEL_WEIGHT = "bold";
  var DEF_LABEL_FONT   = "sans";
  var HLT_LABEL_FONT   = "sans";
  var SEL_LABEL_FONT   = "sans";

  // thumbnails are hidden by default
  var HLT_THUMB_WIDTH  = 91 /2.0;
  var HLT_THUMB_HEIGHT = 109/2.0;
  var SEL_THUMB_WIDTH  = 91 /1.5;
  var SEL_THUMB_HEIGHT = 109/1.5;

  // edge width and colour are scaled 
  // according to edge weights. Also,
  // a default edge opacity of less 
  // than 1.0 will result in a huge 
  // performance hit for large networks.
  var DEF_EDGE_WIDTH   = 1;
  var DEF_EDGE_OPACITY = 1.0;
  var HLT_EDGE_OPACITY = 0.7;

  var DEF_NODE_SIZE    = 3;
  var HLT_NODE_SIZE    = 5;
  var SEL_NODE_SIZE    = 5;
  var DEF_NODE_OPACITY = 0.2;
  var HLT_NODE_OPACITY = 1.0;
  var SEL_NODE_OPACITY = 1.0;

  /*
   * Draw the nodes of the network. It is assumed that the network
   * has the following D3 selections as attributes (which are 
   * created and attached to the network in the displayNetwork 
   * function):
   *
   *   - network.svgNodes:      Place to draw circles representing nodes
   *   - network.svgNodeLabels: Place to draw node labels
   *   - network.svgThumbnails: Place to draw node thumbnails
   *
   * And that the network also has a 'treeNodes' attribute, containing 
   * node in the dendrogram tree (see the makeNetworkDendrogramTree 
   * function).
   */
  function drawNodes(network) {

    var svg    = network.svg;
    var radius = network.radius;

    // We use the D3 cluster layout to draw the nodes in a circle.
    // This also lays out the tree nodes (see the 
    // makeNetworkDendrogramTree function) which represent the 
    // network dendrogram. These nodes are not displayed, but their
    // locations are used to determine the path splines used to
    // display edges (see the drawEdges function).
    var clusterLayout  = d3.layout.cluster().size([360, radius-110]);
    var rootNode       = network.treeNodes[network.treeNodes.length - 1];
    var clusteredNodes = clusterLayout.nodes(rootNode);
    var leafNodes      = network.nodes;

    // Position nodes in a big circle.
    function positionNode(node) {
      return "rotate("    + (node.x - 90) + ")"   + 
             "translate(" + (node.y)      + ",0)" + 
             (node.x < 180 ? "" : "rotate(180)"); 
    }

    // Position labels in a slightly bigger circle.
    function positionLabel(node, off) {
      return "rotate("    + (node.x - 90)   + ")"  + 
             "translate(" + (node.y + 4)  + ",0)" + 
             (node.x < 180 ? "" : "rotate(180)"); 
    }

    // Position thumbnails in an even slightly bigger 
    // circle, ensuring that they are upright.
    function positionThumbnail(node) {
      return "rotate("    + ( node.x - 90) + ")"   + 
             "translate(" + ( node.y + 70) + ",0)" + 
             "rotate("    + (-node.x + 90) + ")"   +
             "translate(-23,-28)";
    }

    // Position node names nicely.
    function anchorLabel(node) {
      return node.x < 180 ? "start" : "end"; 
    }

    // Colour nodes according to their label value
    function colourNode(node) {
      return network.nodeColourScale(node.label);
    }

    // The circle, label and thumbnail for a specific node 
    // are given css class 'node-X', where X is the node 
    // id. For every neighbour of a particular node, that 
    // node is also given the css class  'nodenbr-Y', where 
    // Y is the index of the neighbour.
    function nodeClasses(node) {

      var classes = ["node-" + node.index];

      node.neighbours.forEach(function(nbr) {
        classes.push("nodenbr-" + nbr.index);
      });

      return classes.join(" ");
    }

    // Draw the nodes
    network.svgNodes
      .selectAll("circle")
      .data(network.nodes)
      .enter()
      .append("circle")
      .attr("class",     nodeClasses)
      .attr("transform", positionNode)
      .attr("opacity",   DEF_NODE_OPACITY)
      .attr("r",         DEF_NODE_SIZE)
      .attr("fill",      colourNode);
      
    // Draw the node labels
    network.svgNodeLabels
      .selectAll("text")
      .data(network.nodes)
      .enter()
      .append("text")
      .attr("class",        nodeClasses)
      .attr("dy",          ".31em")
      .attr("opacity",      DEF_NODE_OPACITY)
      .attr("font-family",  DEF_LABEL_FONT)
      .attr("font-weight",  DEF_LABEL_WEIGHT)
      .attr("font-size",    DEF_LABEL_SIZE)
      .attr("fill",         colourNode)
      .attr("transform",    positionLabel)
      .style("text-anchor", anchorLabel)
      .text(function(node) {return node.name; });

    // Draw the node thumbnails 
    network.svgThumbnails
      .selectAll("image")
      .data(network.nodes)
      .enter()
      .append("image")
      .attr("class",       nodeClasses)
      .attr("transform",   positionThumbnail)
      .attr("visibility", "hidden")
      .attr("xlink:href",  function(node) {return node.thumbnail;})
      .attr("width",       0)
      .attr("height",      0);
  }

  /*
   * Draw the edges of the given network. An edge between two nodes
   * is drawn as a spline path which wiggles its way from the first 
   * node, through the dendrogram tree up to the first common 
   * ancester of the two nodes, and then back down to the second 
   * node. Most of the hard work is done by the d3.layout.bundle 
   * function.
   */
  function drawEdges(network) {

    var svg    = network.svg;
    var radius = network.radius;

    // For drawing network edges as splines
    var bundle = d3.layout.bundle();
    var line   = d3.svg.line.radial()
      .interpolate("bundle")
      .tension(.85)
      .radius(function(node) { return node.y - 8; })
      .angle( function(node) { return node.x / 180 * Math.PI; });

     // Each svg path element is given two classes - 'edge-X' 
     // and 'edge-Y', where X and Y are the edge endpoints
    function edgeClasses(path) {
      end = path.length - 1;
      classes = ["edge-" + path[0].index, "edge-" + path[end].index];
      return classes.join(" ");
    }

    // Each edge is also given an id 'edge-X-Y', where 
    // X and Y are the edge endpoints (and X < Y).
    function edgeId(path) {
      end = path.length - 1;
      idxs = [path[0].index, path[end].index];
      idxs.sort(function(a, b){return a-b});
      return "edge-" + idxs[0] + "-" + idxs[1];
    }
    
    // Colour the edges according to the edge weight
    // specified by network.edgeColourWeightIdx.
    function edgeColour(path) {
      return network.defEdgeColourScale(
        path.edge.weights[network.edgeColourWeightIdx]);
    }

    // Generate the spline paths for each edge,
    // and attach each edge as an attribute of
    // its path, and vice versa, to make things
    // easier in the various callback functions
    // passed to D3 (see the configDynamics
    // function)
    var paths = bundle(network.edges);
    for (var i = 0; i < paths.length; i++) {
      paths[i].edge         = network.edges[i];
      network.edges[i].path = paths[i];
    }

    // And we'll also add the paths associated with
    // the edges of each node as an attribute of 
    // that node, again to make D3 callback functions
    // nicer.
    network.nodes.forEach(function(node) {
      node.paths = node.edges.map(function(edge) {return edge.path;});
    });

    // draw the edges
    network.svgEdges
      .selectAll("path")
      .data(paths)
      .enter()
      .append("path")
      .attr("id",              edgeId)
      .attr("class",           edgeClasses)
      .attr("stroke",          edgeColour)
      .attr("stroke-width",    DEF_EDGE_WIDTH)
      .attr("stroke-linecap", "round")
      .attr("opacity",         DEF_EDGE_OPACITY)
      .attr("fill",           "none")
      .attr("d",               line);
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

      var nodeOpacity = DEF_NODE_OPACITY;
      var font        = DEF_LABEL_FONT;
      var fontWeight  = DEF_LABEL_WEIGHT;
      var thumbVis    = "hidden";
      var thumbWidth  = HLT_THUMB_WIDTH;
      var thumbHeight = HLT_THUMB_HEIGHT;

      var edgeOpacity = DEF_EDGE_OPACITY;
      var edgeWidth   = DEF_EDGE_WIDTH;
      var edgeColour  = function(path) {
        return network.defEdgeColourScale(path.edge.weights[0]);};
      
      if (show) {

        nodeOpacity = HLT_NODE_OPACITY;
        font        = HLT_LABEL_FONT;
        fontWeight  = HLT_LABEL_WEIGHT;
        thumbVis    = "visible";
        
        edgeOpacity = HLT_EDGE_OPACITY;
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

      var opacity     = DEF_NODE_OPACITY;
      var font        = DEF_LABEL_FONT;
      var fontWeight  = DEF_LABEL_WEIGHT;
      var fontSize    = DEF_LABEL_SIZE;
      var nodeSize    = DEF_NODE_SIZE;
      var thumbVis    = "hidden";
      var thumbWidth  = 0;
      var thumbHeight = 0;

      if (show === "highlight") {
        opacity     = HLT_NODE_OPACITY;
        font        = DEF_LABEL_FONT;
        fontWeight  = HLT_LABEL_WEIGHT; 
        fontSize    = DEF_LABEL_SIZE;
        nodeSize    = DEF_NODE_SIZE;
        thumbVis    = "visible";
        thumbWidth  = HLT_THUMB_WIDTH;
        thumbHeight = HLT_THUMB_HEIGHT;
      }
      else if (show === "select") {
        opacity     = SEL_NODE_OPACITY;
        font        = SEL_LABEL_FONT;
        fontWeight  = SEL_LABEL_WEIGHT; 
        fontSize    = SEL_LABEL_SIZE;
        nodeSize    = SEL_NODE_SIZE;
        thumbVis    = "visible";
        thumbWidth  = SEL_THUMB_WIDTH;
        thumbHeight = SEL_THUMB_HEIGHT;
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

    
    // Pop-up tooltip on edge paths, which displays
    // edge weights on mouse over.
    // thanks: http://stackoverflow.com/questions/16256454/\
    // d3-js-position-tooltips-using-element-position-not-mouse-position
    var edgeLabelElem = d3.select("body #edgeWeightPopup")
      .style("position",       "absolute")
      .style("padding",        "3px")
      .style("text-align",     "center")
      .style("background",     "#99cc66")
      .style("border-radius",  "5px")
      .style("pointer-events", "none")
      .style("opacity",        "0")

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
    
    // configure events on edges
    svgEdges.selectAll("path")
      .on("mouseover", mouseOverPath);
    svgEdges.selectAll("path")
      .on("mouseout",  mouseOutPath);
    
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

  /*
   * Takes a network created by the matricesToNetowrk 
   * function (see below), and displays it in the 
   * specified networkDiv element, with nodes arranged 
   * in a big circle.
   */
  function displayNetwork(network, div, width, height) {

    var diameter = Math.min(width, height);
    var radius   = diameter / 2;

    // put an svg element inside the networkDiv
    var svg = d3.select(div).append("svg")
      .attr("width",       width)
      .attr("height",      height)
      .style("background-color", "#fafaf0")

    var parentGroup = svg
      .append("g")
      .attr("id", "networkParentGroup")
      .attr("transform", "translate(" + radius + "," + radius + ")");

    // The network display consists of four types of things:
    //   - <circle> elements, one for each node
    //   - <text> elements containing the label for each node
    //   - <image> elements containing the thumbnail for each node
    //   - <path> elements, one for each edge
    //
    // In addition to this, a single div is added to the <body>,
    // which is used as a popup to display edge weights when
    // the mouse moves over an edge.
    // 
    // The order of these lines defines the order in which the 
    // elements are displayed (last displayed on top)
    network.svg           = svg;
    network.radius        = radius;
    network.width         = width;
    network.height        = height;
    network.svgEdges      = parentGroup.append("g");
    network.svgThumbnails = parentGroup.append("g");
    network.svgNodes      = parentGroup.append("g");
    network.svgNodeLabels = parentGroup.append("g");

    // append a div to display edge weights
    d3.select("body")
      .append("div")
      .attr("id", "edgeWeightPopup");

    // Draw all of the things!
    drawNodes(     network);
    drawEdges(     network);
    configDynamics(network);
  }


  function redrawNetwork(network) {

    network.svgNodes     .selectAll("circle").remove();
    network.svgEdges     .selectAll("path")  .remove();
    network.svgNodeLabels.selectAll("text")  .remove();
    network.svgThumbnails.selectAll("image") .remove();

    drawNodes(     network);
    drawEdges(     network);
    configDynamics(network);
  }

  var netvis = {};
  netvis.displayNetwork = displayNetwork;
  netvis.redrawNetwork  = redrawNetwork;

  return netvis;

});
