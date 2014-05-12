/*
 * Display the dendrogram and connectivity of a 
 * of a network using D3.js.
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
   * Takes a network created by the matricesToNetowrk 
   * function (see below), and displays it in the 
   * specified networkDiv element, with nodes arranged 
   * in a big circle.
   */
  function displayNetwork(network, div, width, height) {

    var diameter = Math.min(width, height);
    var radius   = diameter / 2;

    // put an svg element inside the networkDiv
    var svg = network.svg;
    if (!svg) {
      svg = d3.select(div).append("svg")
        .attr("width",       width)
        .attr("height",      height)
        .style("background-color", "#fafaf0")
    }

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


    // Draw all of the things!
    drawNodes(network);
    drawEdges(network);
  }


  function redrawNetwork(network) {

    network.svg.select("#networkParentGroup").remove();

    displayNetwork(network, null, network.width, network.height);
  }

  var netvis = {};
  netvis.displayNetwork   = displayNetwork;
  netvis.redrawNetwork    = redrawNetwork;

  netvis.DEF_LABEL_SIZE   = DEF_LABEL_SIZE;
  netvis.SEL_LABEL_SIZE   = SEL_LABEL_SIZE;
  netvis.DEF_LABEL_WEIGHT = DEF_LABEL_WEIGHT;
  netvis.HLT_LABEL_WEIGHT = HLT_LABEL_WEIGHT;
  netvis.SEL_LABEL_WEIGHT = SEL_LABEL_WEIGHT;
  netvis.DEF_LABEL_FONT   = DEF_LABEL_FONT;
  netvis.HLT_LABEL_FONT   = HLT_LABEL_FONT;
  netvis.SEL_LABEL_FONT   = SEL_LABEL_FONT;
  netvis.HLT_THUMB_WIDTH  = HLT_THUMB_WIDTH;
  netvis.HLT_THUMB_HEIGHT = HLT_THUMB_HEIGHT;
  netvis.SEL_THUMB_WIDTH  = SEL_THUMB_WIDTH;
  netvis.SEL_THUMB_HEIGHT = SEL_THUMB_HEIGHT;
  netvis.DEF_EDGE_WIDTH   = DEF_EDGE_WIDTH;
  netvis.DEF_EDGE_OPACITY = DEF_EDGE_OPACITY;
  netvis.HLT_EDGE_OPACITY = HLT_EDGE_OPACITY;
  netvis.DEF_NODE_SIZE    = DEF_NODE_SIZE;
  netvis.HLT_NODE_SIZE    = HLT_NODE_SIZE;
  netvis.SEL_NODE_SIZE    = SEL_NODE_SIZE;
  netvis.DEF_NODE_OPACITY = DEF_NODE_OPACITY;
  netvis.HLT_NODE_OPACITY = HLT_NODE_OPACITY;
  netvis.SEL_NODE_OPACITY = SEL_NODE_OPACITY;

  return netvis;

});
