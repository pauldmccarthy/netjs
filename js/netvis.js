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
define(["netdata", "lib/d3"], function(netdata, d3) {

  /*
   * Various per-network constants for configuring how
   * nodes, labels, thumbnails, and edges are displayed
   * normally (DEF), when highlighted (HLT), and when
   * selected (SEL).
   */
  var visDefaults = {};
  visDefaults.BACKGROUND_COLOUR = '#fafaf0';

  visDefaults.SHOW_LABELS      = true;
  visDefaults.DEF_LABEL_SIZE   = 10;
  visDefaults.HLT_LABEL_SIZE   = 10;
  visDefaults.SEL_LABEL_SIZE   = 16;
  visDefaults.DEF_LABEL_WEIGHT = "normal";
  visDefaults.HLT_LABEL_WEIGHT = "bold";
  visDefaults.SEL_LABEL_WEIGHT = "bold";
  visDefaults.DEF_LABEL_FONT   = "sans";
  visDefaults.HLT_LABEL_FONT   = "sans";
  visDefaults.SEL_LABEL_FONT   = "sans";

  visDefaults.DEF_NODE_SIZE    = 3;
  visDefaults.HLT_NODE_SIZE    = 3;
  visDefaults.SEL_NODE_SIZE    = 5;
  visDefaults.DEF_NODE_OPACITY = 0.5;
  visDefaults.HLT_NODE_OPACITY = 1.0;
  visDefaults.SEL_NODE_OPACITY = 1.0;

  visDefaults.DEF_THUMB_VISIBILITY = "hidden";
  visDefaults.HLT_THUMB_VISIBILITY = "visible";
  visDefaults.SEL_THUMB_VISIBILITY = "visible";
  visDefaults.DEF_THUMB_WIDTH  = 91 /2.5;
  visDefaults.HLT_THUMB_WIDTH  = 91 /2.5;
  visDefaults.SEL_THUMB_WIDTH  = 91 /2.0;
  visDefaults.DEF_THUMB_HEIGHT = 109/2.5;
  visDefaults.HLT_THUMB_HEIGHT = 109/2.5;
  visDefaults.SEL_THUMB_HEIGHT = 109/2.0;

  // edge width and colour are scaled
  // according to edge weights. Also,
  // a default edge opacity of less
  // than 1.0 will result in a huge
  // performance hit for large networks.
  visDefaults.DEF_EDGE_COLOUR  = "default";
  visDefaults.HLT_EDGE_COLOUR  = "highlight";
  visDefaults.DEF_EDGE_WIDTH   = 1;
  visDefaults.HLT_EDGE_WIDTH   = "scale";
  visDefaults.MIN_EDGE_WIDTH   = 1;
  visDefaults.MAX_EDGE_WIDTH   = 15;
  visDefaults.EDGE_WIDTH_MIN   = null;
  visDefaults.EDGE_WIDTH_MAX   = null;
  visDefaults.EDGE_OPACITY     = 1.0;

  visDefaults.NODE_RADIUS_OFFSET      = 110;
  visDefaults.EDGE_RADIUS_OFFSET      = 8;
  visDefaults.LABEL_RADIUS_OFFSET     = 20;
  visDefaults.THUMBNAIL_RADIUS_OFFSET = 70;

  visDefaults.EDGE_MIN_COLOUR  = "#0000dd";
  visDefaults.EDGE_MID_COLOUR  = "#eeeeee";
  visDefaults.EDGE_MAX_COLOUR  = "#dd0000";
  visDefaults.EDGE_COLOURMAP   = null;
  visDefaults.EDGE_COLOUR_MIN  = null;
  visDefaults.EDGE_COLOUR_MAX  = null;

  visDefaults.GROUP_DISTANCE   = 1.5;

  /*
   * Generates D3 colour (and edge width) scales for the given
   * network, and attaches them as attributes of the given
   * scaleInfo object.
   *
   * It is assumed that the scaleInfo object already has the following
   * properties:
   *
   *   - edgeWidthIdx:  Index of the edge weight to be used
   *                    for scaling edge widths.
   *
   *   - edgeColourIdx: Index of the edge weight to be used
   *                    for scaling edge colours.
   *
   *   - nodeColourIdx: Index of the node data to be used for
   *                    scaling node colours.
   *
   * The following attributes are added to the scaleInfo object:
   *
   *   - nodeColourScale:     Colours nodes according to the
   *                          node data at nodeColourIdx.
   *
   *   - edgeWidthScale:      Scales edge widths according to the edge
   *                          weight at index edgeWidthIdx.
   *
   *   - defEdgeColourScale:  Colours edges, when not highlighted,
   *                          according to the edge weight at index
   *                          edgeColourIdx.
   *
   *   - hltEdgeColourScale:  Colours edges, when highlighted,
   *                          according to the edge weight at
   *                          index edgeColourIdx.
   *
   *   - nodeColour:          Function which takes a node object,
   *                          and returns a colour for it.
   *
   *   - defEdgeColour:       Function which takes an edge object,
   *                          and returns a default colour for it.
   *
   *   - hltEdgeColour:       Function which takes an edge object,
   *                          and returns a highlight colour for it.
   *
   *   - edgeWidth:           Function which takes an edge object,
   *                          and returns a width for it.
   *
   *   - *Path*:              Same as the above *Edge* functions,
   *                          except these ones accept an object
   *                          which is assumed to have an edge
   *                          object as an attribute called 'edge'.
   */
  function genColourScales(network, scaleInfo) {

    var ewwIdx = scaleInfo.edgeWidthIdx;
    var ecwIdx = scaleInfo.edgeColourIdx;

    // Nodes are coloured according to their node data.
    // TODO handle more than 10 node labels?
    var nodeColourScale = d3.scale.category10();

    var ecMin = network.matrixAbsMins[ecwIdx];
    var ecMax = network.matrixAbsMaxs[ecwIdx];
    var ewMin = network.matrixAbsMins[ewwIdx];
    var ewMax = network.matrixAbsMaxs[ewwIdx];

    if (network.display.EDGE_COLOUR_MIN !== null)
      ecMin = network.display.EDGE_COLOUR_MIN;
    if (network.display.EDGE_COLOUR_MAX !== null)
      ecMax = network.display.EDGE_COLOUR_MAX;
    if (network.display.EDGE_WIDTH_MIN !== null)
      ewMin = network.display.EDGE_WIDTH_MIN;
    if (network.display.EDGE_WIDTH_MAX !== null)
      ewMax = network.display.EDGE_WIDTH_MAX;

    // Edge width scale
    var edgeWidthScale = d3.scale.linear()
      .domain([-ewMax, -ewMin, -0, ewMin, ewMax])
      .range( [network.display.MAX_EDGE_WIDTH,
               network.display.MIN_EDGE_WIDTH,
               0,
               network.display.MIN_EDGE_WIDTH,
               network.display.MAX_EDGE_WIDTH])
      .clamp(true);

    if (network.display.EDGE_COLOURMAP !== null) {

      if (network.display.EDGE_COLOURMAP.length % 2 == 0) {
        throw "Colour map must have an odd number of colours!";
      }

      // Make a colour map which covers
      // [-max, -min, 0, min, max],  where
      // the [-min, 0, min] section maps
      // to the central colour.
      halfway = Math.floor(network.display.EDGE_COLOURMAP.length / 2);
      delta   = (ecMax - ecMin) / halfway;
      range   =  network.display.EDGE_COLOURMAP.slice(0, halfway + 1).concat(
                [network.display.EDGE_COLOURMAP[halfway]]).concat(
                [network.display.EDGE_COLOURMAP[halfway]]).concat(
                 network.display.EDGE_COLOURMAP.slice(halfway + 1));

      domain  = d3.range(-ecMax, -ecMin + delta, delta).concat(
        [0]).concat(d3.range(ecMin, ecMax + delta, delta));
    }
    else {
      domain = [-ecMax, -ecMin, 0, ecMin, ecMax];
      range  = [network.display.EDGE_MIN_COLOUR,
                network.display.EDGE_MID_COLOUR,
                network.display.EDGE_MID_COLOUR,
                network.display.EDGE_MID_COLOUR,
                network.display.EDGE_MAX_COLOUR];
    }

    // Colour scale for highlighted edges
    var hltEdgeColourScale = d3.scale.linear().domain(domain).range(range);

    // The colour scale for non-highlighted edges
    // is a washed out version of that used for
    // highlighted edges. Could achieve the same
    // effect with opacity, but avoiding opacity
    // gives better performance.
    var edgeColourHltToDef = d3.scale.linear()
      .domain([0,   255])
      .range( [210, 240]);

    var defEdgeColourScale = function(val) {
      var c = d3.rgb(hltEdgeColourScale(val));

      var cols = [c.r,c.g,c.b];
      cols.sort(function(a,b) {return a-b;});

      var ri = cols.indexOf(c.r);
      var gi = cols.indexOf(c.g);
      var bi = cols.indexOf(c.b);

      c.r = Math.ceil(edgeColourHltToDef(cols[ri]));
      c.g = Math.ceil(edgeColourHltToDef(cols[gi]));
      c.b = Math.ceil(edgeColourHltToDef(cols[bi]));

      return c;
    }

    // attach all those scales as attributes
    // of the provided scaleinfo object
    scaleInfo.nodeColourScale    = nodeColourScale;
    scaleInfo.edgeWidthScale     = edgeWidthScale;
    scaleInfo.defEdgeColourScale = defEdgeColourScale;
    scaleInfo.hltEdgeColourScale = hltEdgeColourScale;

    // And attach a bunch of convenience
    // functions for use in d3 attr calls
    scaleInfo.nodeColour = function(node) {
      return scaleInfo.nodeColourScale(
        node.nodeData[network.scaleInfo.nodeColourIdx]);
    };

    scaleInfo.defEdgeColour = function(edge) {
      return scaleInfo.defEdgeColourScale(
        edge.weights[scaleInfo.edgeColourIdx]);
    };

    // The *Path* functions are provided, as
    // edges are represented as spline paths
    // (see netvis.js)
    scaleInfo.defPathColour = function(path) {
      return scaleInfo.defEdgeColourScale(
        path.edge.weights[scaleInfo.edgeColourIdx]);
    };

    scaleInfo.hltEdgeColour = function(edge) {
      return scaleInfo.hltEdgeColourScale(
        edge.weights[scaleInfo.edgeColourIdx]);
    };

    scaleInfo.hltPathColour = function(path) {
      return scaleInfo.hltEdgeColourScale(
        path.edge.weights[scaleInfo.edgeColourIdx]);
    };

    scaleInfo.edgeWidth = function(edge) {
      return scaleInfo.edgeWidthScale(
        edge.weights[scaleInfo.edgeWidthIdx]);
    };

    scaleInfo.pathWidth = function(path) {
      return scaleInfo.edgeWidthScale(
        path.edge.weights[scaleInfo.edgeWidthIdx]);
    };
  }


  /*
   * Positions the network nodes according to the
   * linkags/dendrogram information
   */
  function dendrogramLayout(network) {

    var radius = network.display.radius;

    // We use the D3 cluster layout to draw the nodes in a circle.
    // This also lays out the tree nodes (see the
    // makeNetworkDendrogramTree function) which represent the
    // network dendrogram. These nodes are not displayed, but their
    // locations are used to determine the path splines used to
    // display edges (see the drawEdges function).

    function sep(a, b) {
      return a.parent == b.parent ? 1 : visDefaults.GROUP_DISTANCE;
    }


    var clusterLayout  = d3.layout.cluster()
      .size([360, radius-network.display.NODE_RADIUS_OFFSET])
        .separation(sep)
        .sort(function(a, b) { return d3.ascending(a.order, b.order); });

    var rootNode       = network.treeNodes[network.treeNodes.length - 1];
    var clusteredNodes = clusterLayout.nodes(rootNode);

    // If network pruning is enabled, pruned nodes
    // will not have a parent - remove these nodes.
    // See netdata.js:pruneDendrogramTree.
    var leafNodes      = network.nodes.filter(function (n) {
      return n.parent !== null;
    });

    return leafNodes;
  }

  /*
   * Positions the nodes according to a fixed ordering.
   */
  function fixedLayout(network) {

    var radius    = network.display.radius;
    var rootNode  = network.treeNodes[network.treeNodes.length - 1];
    var nodes     = network.nodes;
    var nodeOrder;

    if (network.nodeOrders.length > 0)
      nodeOrder = network.nodeOrders[network.nodeOrderIdx];
    else
      nodeOrder = Array.apply(null, Array(nodes.length)).map(function (_, i) {return i;});

    // If pruningState is true, we need
    // to hide disconnected nodes. So
    // we filter the node list, and
    // adjust the node ordering accordingly.
    if (network.pruningState) {

      var mask = [];

      for (var i = 0; i < nodes.length; i++) {

        if (nodes[i].neighbours.length > 0) mask.push(1);
        else                                mask.push(0);
      }

      nodeOrder = netdata.adjustIndices(nodeOrder, mask);
      nodes     = nodes.filter(function(n, i) {
        return mask[i] > 0;
      });
    }

    var numNodes = nodes.length;

    // We are constructing a dendrogram
    // of depth 1 i.e. with a single root
    // node, and [numNodes] leaf nodes.
    //
    // We need to add all of these attributes
    // to each node in the dendrogram tree
    // so that edge paths can be calculated.
    //
    // See the documentation for
    // the d3.layout.cluster and
    // d3.layout.bundle functions.
    rootNode.x        = 0;
    rootNode.y        = 0;
    rootNode.depth    = 0;
    rootNode.children = nodes;

    for (var i = 0; i < numNodes; i++) {

      var node = nodes[nodeOrder[i]];
      var parent;

      if (node.neighbours.length === 0) parent = null;
      else                              parent = rootNode;

      node.x        = (i / numNodes) * 360;
      node.y        = radius - network.display.NODE_RADIUS_OFFSET;
      node.parent   = parent;
      node.depth    = 1;
      node.children = null;
    }

    return nodes;
  }

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

    var svg = network.display.svg;
    var nodes;

    // Layout the nodes according to
    // the dendrogram, or use a fixed
    // node ordering, depending upon
    // the value of nodeOrderIdx.
    if (network.nodeOrderIdx === -1) nodes = dendrogramLayout(network);
    else                             nodes = fixedLayout(     network);

    // Position nodes in a big circle.
    function positionNode(node) {
      return "rotate("    + (node.x - 90) + ")"   +
             "translate(" + (node.y)      + ",0)" +
             (node.x < 180 ? "" : "rotate(180)");
    }

    // Position labels in a slightly bigger circle.
    function positionLabel(node) {
      return "rotate("    + (node.x - 90)   + ")"  +
             "translate(" + (node.y + network.display.LABEL_RADIUS_OFFSET)  + ",0)" +
             (node.x < 180 ? "" : "rotate(180)");
    }

    // Position thumbnails in an even slightly bigger
    // circle, ensuring that they are upright.
    var halfThumbW = network.display.DEF_THUMB_WIDTH  / 2.0;
    var halfThumbH = network.display.DEF_THUMB_HEIGHT / 2.0;
    var yoff       = network.display.THUMBNAIL_RADIUS_OFFSET;

    function positionThumbnail(node) {
      return "rotate("    + ( node.x - 90) + ")"   +
             "translate(" + ( node.y + yoff) + ",0)" +
             "rotate("    + (-node.x + 90) + ")" +
             "translate(-" + halfThumbW + ",-" + halfThumbH + ")";
    }

    // Position node names nicely.
    function anchorLabel(node) {
      return node.x < 180 ? "start" : "end";
    }

    // The circle, label and thumbnail for a specific node
    // are given css class 'node-X', where X is the node
    // index. For every neighbour of a particular node, that
    // node is also given the css class  'nodenbr-Y', where
    // Y is the index of the neighbour.
    function nodeClasses(node) {

      var classes = ["node-" + node.index];

      node.neighbours.forEach(function(nbr) {
        classes.push("nodenbr-" + nbr.index);
      });

      return classes.join(" ");
    }

    function nodeNames(node) {
      if (network.nodeNameIdx == -1)
        return "" + (node.index + 1);

      return network.nodeNames[network.nodeNameIdx][node.index];
    }

    // Draw the nodes
    network.display.svgNodes
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("class",     nodeClasses)
      .attr("transform", positionNode)
      .attr("opacity",   network.display.DEF_NODE_OPACITY)
      .attr("r",         network.display.DEF_NODE_SIZE)
      .attr("fill",      network.scaleInfo.nodeColour);

    // Draw the node labels
    if (network.display.SHOW_LABELS === true) {
      network.display.svgNodeLabels
        .selectAll("text")
        .data(nodes)
        .enter()
        .append("text")
        .attr("class",        nodeClasses)
        .attr("dy",          ".31em")
        .attr("opacity",      network.display.DEF_NODE_OPACITY)
        .attr("font-family",  network.display.DEF_LABEL_FONT)
        .attr("font-weight",  network.display.DEF_LABEL_WEIGHT)
        .attr("font-size",    network.display.DEF_LABEL_SIZE)
        .attr("fill",         network.scaleInfo.nodeColour)
        .attr("transform",    positionLabel)
        .style("text-anchor", anchorLabel)
        .text(nodeNames);
  }

    // Draw the node thumbnails
    network.display.svgThumbnails
      .selectAll("image")
      .data(nodes)
      .enter()
      .append("image")
      .attr("class",       nodeClasses)
      .attr("transform",   positionThumbnail)
      .attr("visibility",  network.display.DEF_THUMB_VISIBILITY)
      .attr("width",       network.display.DEF_THUMB_WIDTH)
      .attr("height",      network.display.DEF_THUMB_HEIGHT)
      .attr("xlink:href",  function(node) {return node.thumbnail;});
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

    var svg    = network.display.svg;
    var radius = network.display.radius;

    // For drawing network edges as splines
    var bundle = d3.layout.bundle();
    var line   = d3.svg.line.radial()
      .interpolate("bundle")
      .tension(.85)
      .radius(function(node) { return node.y - network.display.EDGE_RADIUS_OFFSET; })
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

    var edgeColour = network.display.DEF_EDGE_COLOUR;
    var edgeWidth  = network.display.DEF_EDGE_WIDTH;

    if      (edgeWidth  === "scale")
      edgeWidth  = network.scaleInfo.pathWidth;
    if      (edgeColour === "default")
      edgeColour = network.scaleInfo.defPathColour;
    else if (edgeColour === "highlight")
      edgeColour = network.scaleInfo.hltPathColour;

    // draw the edges
    network.display.svgEdges
      .selectAll("path")
      .data(paths)
      .enter()
      .append("path")
      .attr("id",              edgeId)
      .attr("class",           edgeClasses)
      .attr("stroke",          edgeColour)
      .attr("stroke-width",    edgeWidth)
      .attr("stroke-linecap", "round")
      .attr("fill",           "none")
      .attr("opacity",         network.display.DEF_EDGE_OPACITY)
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
    var svg = null;
    if (!network.display || !network.display.svg) {
      svg = d3.select(div).append("svg")
        .attr("version",           "1.1")
        .attr("xmlns",             "http://www.w3.org/2000/svg")
        .attr("width",             width)
        .attr("height",            height)
        .style("background-color", visDefaults.BACKGROUND_COLOUR);
    }
    else {
      svg = network.display.svg;
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

    if (!network.display) network.display = {};
    network.display.svg           = svg;
    network.display.radius        = radius;
    network.display.width         = width;
    network.display.height        = height;

    // The order of these lines defines the order in which the
    // elements are displayed (last displayed on top)
    network.display.svgEdges      = parentGroup.append("g");
    network.display.svgThumbnails = parentGroup.append("g");
    network.display.svgNodes      = parentGroup.append("g");
    network.display.svgNodeLabels = parentGroup.append("g");

    for (var prop in visDefaults) {
      if (!network.display[prop])
        network.display[prop] = visDefaults[prop];
    }

    genColourScales(network, network.scaleInfo);

    // Draw all of the things!
    drawNodes(network);
    drawEdges(network);
  }

  /*
   * Redraws the given network on its pre-existing svg canvas.
   */
  function redrawNetwork(network) {
    network.display.svg.select("#networkParentGroup").remove();
    displayNetwork(
      network, null, network.display.width, network.display.height);
  }

  /*
   * Deletes the SVG canvas associated with the given network.
   */
  function clearNetwork(network) {

    if (!network.display) return;
    network.display.svg.remove();
    delete network.display;
  }

  var netvis = {};
  netvis.displayNetwork = displayNetwork;
  netvis.redrawNetwork  = redrawNetwork;
  netvis.clearNetwork   = clearNetwork;
  netvis.visDefaults    = visDefaults;
  return netvis;

});
