/*
 * 
 */
define(["lib/d3", "lib/queue"], function(d3, queue) {

  /*
   * Generates D3 colour (and edge width) scales for the given
   * network, and attaches them as attributes of the network.
   * It is assumed that the network object already has two 
   * properties:
   *   - edgeWidthWeightIdx:  Index of the edge weight to be used
   *                          for scaling edge widths.
   *
   *   - edgeColourWeightIdx: Index of the edge weight to be used
   *                          for scaling edge colours.
   *
   * The following attributes are added to the network object:
   *
   *   - nodeColourScale:     Colours nodes according to their label
   *
   *   - edgeWidthScale:      Scales edge widths according to the edge 
   *                          weight at index edgeWidthWeightIdx.
   *
   *   - defEdgeColourScale:  Colours edges, when not highlighted, 
   *                          according to the edge weight at index 
   *                          edgeColourWeightIdx.
   *
   *   - hltEdgeColourScale:  Colours edges, when highlighted, according 
   *                          to the edge weight at index 
   *                          edgeColourWeightIdx.
   */
  function genColourScales(network, scaleInfo) {
    
    var ewwIdx = scaleInfo.edgeWidthWeightIdx;
    var ecwIdx = scaleInfo.edgeColourWeightIdx;

    // Nodes are coloured according to their label
    // TODO handle more than 10 labels?
    var nodeColourScale = d3.scale.category10();

    var ecMin = network.weightAbsMins[ecwIdx];
    var ecMax = network.weightAbsMaxs[ecwIdx];
    var ewMin = network.weightAbsMins[ewwIdx];
    var ewMax = network.weightAbsMaxs[ewwIdx];

    // Edge width scale
    var edgeWidthScale = d3.scale.linear()
      .domain([-ewMax, -ewMin, 0, ewMin, ewMax])
      .range( [    15,      2, 0,     2,    15]);

    // Colour scale for highlighted edges
    var hltEdgeColourScale = d3.scale.linear()
      .domain([ -ecMax,    -ecMin,    0,          ecMin,     ecMax  ])
      .range( ["#0000dd", "#ccccdd", "#ffffff", "#ddaaaa", "#dd0000"]);

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

    // attach all those scales as 
    // attributes of the network
    scaleInfo.nodeColourScale    = nodeColourScale;
    scaleInfo.edgeWidthScale     = edgeWidthScale;
    scaleInfo.defEdgeColourScale = defEdgeColourScale;
    scaleInfo.hltEdgeColourScale = hltEdgeColourScale;
  }

  /*
   * Recursively prints a description of the dendrogram 
   * tree to the console, starting from the given root 
   * node. See the makeNetworkDendrogramTree function
   * (below) for details of the dendrogram tree. 
   * 
   * This function is here for debugging purposes.
   */
  function printTree(root, depth) {

    desc = "";
    for (var i = 0; i < depth; i++) desc = desc + " ";

    desc = desc + (root.index+1) + ": ";

    if (!root.children) return;

    childIdxs = root.children.map(function(child) {return child.index+1;});
    desc = desc + childIdxs.join(", ");

    console.log(desc);

    root.children.forEach(function(child) {
      printTree(child, depth + 1);
    });
  }

  function printNetwork(network) {

    network.nodes.forEach(function(node) {
      var nbrs = node.neighbours.map(function(nbr) {return nbr.name;});
      console.log(node.name + ": (" + node.neighbours.length +  ")" + nbrs.join(", "));
    });
  }


  function isSymmetric(matrix) {

    for (var i = 0; i < matrix.length; i++) {
      for (var j = 0; j < matrix.length; j++) {

        if (isNaN(matrix[i][j]) && isNaN(matrix[j][i])) continue;

        if (matrix[i][j] !== matrix[j][i]) return false;
      }
    }

    return true;
  }

  function printMatrix(matrix) {

    var fmt = d3.format("5.2f");

    var colHdrs = [];
    for (var i = 0; i < matrix[0].length; i++) {
      colHdrs.push(fmt(i));
    }

    console.log("      " + colHdrs.join(" "));

    for (var i = 0; i < matrix.length; i++) {

      var rowvals = matrix[i].map(function(val) {return fmt(val);});

      console.log(fmt(i) + " " + rowvals.join(" "));
    }

    if (isSymmetric(matrix)) console.log("Symmetric");
    else                     console.log("Not symmetric");
  }

  /*
   * Flattens the dendrogram tree for the given network 
   * (see the makeNetworkDendrogramTree function below), 
   * such that it contains at most maxClusters clusters. 
   * This function basically performs the same job as 
   * the MATLAB cluster function, e.g.:
   *
   *   > cluster(linkages, 'maxclust', maxClusters)
   */
  function flattenDendrogramTree(network, maxClusters) {

    // Returns a list of tree nodes which contain leaf 
    // nodes - the current 'clusters' in the tree.
    function getClusters() {

      var allClusts  = network.nodes.map(function(node) {return node.parent;});
      var uniqClusts = [];

      for (var i = 0; i < allClusts.length; i++) {
        if (uniqClusts.indexOf(allClusts[i]) > -1) continue;
        uniqClusts.push(allClusts[i]);
      }

      //var clIdxs = uniqClusts.map(function(c) {return c.index;});
      //console.log("Clusters: " + clIdxs.join(", "));
      return uniqClusts;
    }

    // Iterate through the list of clusters, 
    // merging them  one by one, until we are 
    // left with (at most) maxClusters.
    var clusters = getClusters();

    while (clusters.length > maxClusters) {
      //console.log("Tree:");
      //printTree(network.treeNodes[network.treeNodes.length - 1], 0);

      // Identify the cluster with the minimum 
      // distance  between its children
      distances = clusters.map(function(clust) {return clust.distance;});
      minIdx    = distances.indexOf(d3.min(distances));

      clust         = clusters[minIdx];
      parent        = clust.parent;
      children      = clust.children;
      clustChildIdx = parent.children.indexOf(clust);
      clustTreeIdx  = network.treeNodes.indexOf(clust);
      
      // Squeeze that cluster node out of the 
      // tree, by attaching its children to its 
      // parent and vice versa.
      parent .children .splice(clustChildIdx, 1);
      network.treeNodes.splice(clustTreeIdx,  1);

      children.forEach(function(child) {
        child.parent = parent;
        parent.children.push(child);
      });

      // Update the cluster list
      clusters = getClusters();
    }
  }

  /*
   * Given a network (see the makeNetwork function), and the 
   * output of a call to the MATLAB linkage function which 
   * describes the dendrogram of clusters of the network 
   * nodes, this function creates a list of 'dummy' nodes 
   * which represent the dendrogram tree. This list is added 
   * as an attribute called 'treeNodes' of the provided 
   * network.
   */
  function makeNetworkDendrogramTree(network, linkages) {

    var numNodes  = network.nodes.length;
    var treeNodes = [];

    for (var i = 0; i < linkages.length; i++) {
      var treeNode = {};
      var left     = linkages[i][0];
      var right    = linkages[i][1];

      if (left  > numNodes) left  = treeNodes[    left  - 1 - numNodes];
      else                  left  = network.nodes[left  - 1];
      if (right > numNodes) right = treeNodes[    right - 1 - numNodes];
      else                  right = network.nodes[right - 1];

      left .parent = treeNode;
      right.parent = treeNode;

      treeNode.children = [left, right];
      treeNode.distance = linkages[i][2];
      treeNode.index = i + numNodes;

      treeNodes.push(treeNode);
    }

    network.treeNodes = treeNodes;
  }



  function extractSubMatrix(matrix, indices) {
    var submat = [];

    for (var i = 0; i < indices.length; i++) {

      var row = [];
      for (var j = 0; j < indices.length; j++) {

        row.push(matrix[indices[i]][indices[j]]);
      }
      submat.push(row);
    }

    return submat;
  }


  /*
   *
   */
  function extractSubNetwork(network, rootIdx) {

    var nodeIdxs = [rootIdx];
    var oldRoot  = network.nodes[rootIdx];

    for (var i = 0; i < oldRoot.neighbours.length; i++) {

      var nbrIdx = oldRoot.neighbours[i].index;
      nodeIdxs.push(nbrIdx);
    }
    nodeIdxs.sort();

    var subMats = network.matrices.map(
      function(mat) {return extractSubMatrix(mat, nodeIdxs);});

    var subLabels = nodeIdxs.map(
      function(idx) {return network.nodes[idx].label;});

    var subnet = createNetwork(
      subMats, 
      network.weightLabels, 
      subLabels,
      null,
      network.thumbUrl,
      network.thresholdFunc,
      network.thresholdArgLabels,
      network.thresholdArgs,
      network.thresholdIdx,
      1);

    subnet.parentNetwork = network;

    // Fix node names and thumbnails, and 
    // add indices back to parent network
    var zerofmt = d3.format("04d");
    for (var i = 0; i < subnet.nodes.length; i++) {

      var node = subnet.nodes[i];

      node.name         = network.nodes[nodeIdxs[i]].name;
      node.fullNetIndex = network.nodes[nodeIdxs[i]].index;

      var imgurl = network.thumbUrl + "/" + zerofmt(nodeIdxs[i]) + ".png";
      node.thumbnail = imgurl;
    }


    var root = {};
    root.index    = subnet.nodes.length;
    root.children = subnet.nodes;
    subnet.nodes.forEach(function(node) {node.parent = root;});
    subnet.treeNodes = [root];

    return subnet;
  }

  /*
   * Creates a network from the given list of matrices. The 
   * network edges are defined by the first matrix in the 
   * matrix list - any entries in this matrix which are not 
   * NaN will be added as an edge in the network. The values 
   * in all other matrices are added as 'weight' attributes 
   * on the corresponding network edge.
   */
  function thresholdNetwork(network) {

    // A network is simply a list of nodes and edges
    var edges    = [];
    var matrix   = network.matrices[network.thresholdIdx];
    var numNodes = network.nodes.length;

    // Create a list of edges. At the same time, we'll 
    // figure out the real and absolute max/min values 
    // for each weight matrix across all edges, so they 
    // can be used to scale edge colour/width/etc properly.
    var weightMins    = [];
    var weightMaxs    = [];
    var weightAbsMins = [];
    var weightAbsMaxs = [];

    // threshold the matrix
    matrix = network.thresholdFunc(matrix, network.thresholdArgs);
    
    // initialise min/max arrays
    for (var i = 0; i < network.matrices.length; i++) {
      weightMins   .push( Number.MAX_VALUE);
      weightMaxs   .push(-Number.MAX_VALUE);
      weightAbsMins.push( Number.MAX_VALUE);
      weightAbsMaxs.push(-Number.MAX_VALUE);
    }

    // initialise node neighbour/edge arrays
    for (var i = 0; i < numNodes; i++) {
      network.nodes[i].edges      = [];
      network.nodes[i].neighbours = [];
    }

    for (var i = 0; i < numNodes; i++) {
      for (var j = i+1; j < numNodes; j++) {

        // NaN values in the matrix
        // are not added as edges
        if (isNaN(matrix[i][j])) continue;

        var edge     = {};
        edge.i       = network.nodes[i];
        edge.j       = network.nodes[j];

        // d3.layout.bundle and d3.layout.force require two 
        // attributes, 'source' and 'target', so we add them 
        // here, purely for  convenience.
        edge.source  = network.nodes[i];
        edge.target  = network.nodes[j];
        edge.weights = network.matrices.map(function(mat) {return mat[i][j]; });

        edges              .push(edge);
        network.nodes[i].neighbours.push(network.nodes[j]);
        network.nodes[j].neighbours.push(network.nodes[i]);
        network.nodes[i].edges     .push(edge);
        network.nodes[j].edges     .push(edge);

        // update weight mins/maxs
        for (var k = 0; k < edge.weights.length; k++) {

          var w  =          edge.weights[k];
          var aw = Math.abs(edge.weights[k]);

          if (w  > weightMaxs[k])    weightMaxs[k]    = w;
          if (w  < weightMins[k])    weightMins[k]    = w;
          if (aw > weightAbsMaxs[k]) weightAbsMaxs[k] = aw;
          if (aw < weightAbsMins[k]) weightAbsMins[k] = aw;
        }
      }
    }

    network.edges         = edges;
    network.weightMins    = weightMins;
    network.weightMaxs    = weightMaxs;
    network.weightAbsMins = weightAbsMins;
    network.weightAbsMaxs = weightAbsMaxs;
  }

  /*
   * Converts all the given text data into numerical matrices,
   * thresholds znet2 matrix, and does some other minor tweaks,
   * then passes all the data to the makeNetwork function, and
   * passes the resulting network to the displayNetwork function.
   */
  function createNetwork(
    matrices,
    matrixLabels,
    nodeLabels,
    linkage,
    thumbUrl,
    thresholdFunc,
    thresholdArgLabels,
    thresholdArgs,
    thresholdIdx,
    numClusters) {

    var network  = {};
    var nodes    = [];
    var numNodes = matrices[0].length;
    var zerofmt  = d3.format("04d");

    // Create a list of nodes
    for (var i = 0; i < numNodes; i++) {

      var node = {};

      // Node name is 1-indexed
      node.index      = i;
      node.name       = "" + (i+1);
      node.label      = nodeLabels[i];

      // Attach a thumbnail URL to 
      // every node in the network
      var imgUrl = thumbUrl + "/" + zerofmt(i) + ".png";
      node.thumbnail = imgUrl;

      nodes.push(node);
    }

    network.nodes              = nodes;
    network.matrices           = matrices;
    network.weightLabels       = matrixLabels;
    network.nodeLabels         = nodeLabels;
    network.linkage            = linkage;
    network.thumbUrl           = thumbUrl;
    network.thresholdFunc      = thresholdFunc;
    network.thresholdArgs      = thresholdArgs;
    network.thresholdArgLabels = thresholdArgLabels;
    network.thresholdIdx       = thresholdIdx;

    // create the network edges
    thresholdNetwork(network);

    // create a dendrogram, and flatten it 
    // to the specified number of clusers
    setNumClusters(network, numClusters);

    // create scale information for 
    // colouring/scaling nodes and edges
    var scaleInfo = {};
    scaleInfo.edgeWidthWeightIdx  = 0;
    scaleInfo.edgeColourWeightIdx = 0;

    genColourScales(network, scaleInfo);

    network.scaleInfo = scaleInfo;

    console.log(network);

    return network;
  }

  /*
   *
   */
  function setNumClusters(network, numClusts) {

    if (network.linkage === null) return;

    // generate a tree of dummy nodes from 
    // the dendrogram in the linkages data
    makeNetworkDendrogramTree(network, network.linkage);

    // flatten the tree to the specified number of clusters
    flattenDendrogramTree(network, numClusts);
  }

  function setEdgeWidthWeightIdx(network, idx) {
    console.log("width: " + idx);
    network.scaleInfo.edgeWidthWeightIdx = idx;
    genColourScales(network, network.scaleInfo);
  }


  function setEdgeColourWeightIdx(network, idx) {
    network.scaleInfo.edgeColourWeightIdx = idx;
    genColourScales(network, network.scaleInfo);
  }

  /*
   * Uses d3.dsv to turn a string containing 
   * numerical matrix data into a 2D array.
   */
  function parseTextMatrix(matrixText) { 

    // create a parser for space delimited text
    var parser = d3.dsv(" ", "text/plain");
      
    // parse the text data, converting each value to 
    // a float and ignoring any extraneous whitespace
    // around or between values.
    var matrix = parser.parseRows(matrixText, function(row) {
      row = row.filter(function(value) {return value != ""; } );
      row = row.map(   function(value) {return parseFloat(value);});
      return row;
    });

    return matrix;
  }

  /*
   *
   */
  function onDataLoad(error, args) {

    // TODO handle error

    var linkage      = args[args.length-1];
    var nodeLabels   = args[args.length-2];
    var matrixLabels = args[args.length-3];
    var thumbUrl     = args[args.length-4];
    var cbFunc       = args[args.length-5];
    var thresArgs    = args[args.length-6];
    var thresFunc    = args[args.length-7];

    args.splice(-7, 7);
    var matrices = args;

    linkage    = parseTextMatrix(linkage);
    nodeLabels = parseTextMatrix(nodeLabels)[0];
    matrices   = matrices.map(parseTextMatrix);

    thresArgLabels = thresArgs.map(function(arg) {return arg[0];});
    thresArgs      = thresArgs.map(function(arg) {return arg[1];});
    console.log(matrices);
    console.log(matrixLabels);

    network = createNetwork(
      matrices, 
      matrixLabels, 
      nodeLabels, 
      linkage, 
      thumbUrl,
      thresFunc,
      thresArgLabels,
      thresArgs,
      0,
      1);
    cbFunc(network);
  }

  /*
   *
   */
  function loadNetwork(args, cbFunc) {

    var matrixUrls    = args.matrices;
    var matrixLabels  = args.matrixLabels;
    var nodeLabelsUrl = args.nodeLabels;
    var linkageUrl    = args.linkage;
    var thumbUrl      = args.thumbnails;
    var thresFunc     = args.thresFunc;
    var thresArgs     = args.thresArgs;

    // The qId function is an identity function 
    // which may be used to pass standard 
    // arguments to the await function.
    function qId(arg, cb) {cb(null, arg);}

    // Load all of the network data, and 
    // pass it to the onDataLoad function. 
    var q = queue();
    
    matrixUrls.forEach(function(url) {
      q = q.defer(d3.text, url);
    });

    q .defer(qId,     thresFunc)
      .defer(qId,     thresArgs)
      .defer(qId,     cbFunc)
      .defer(qId,     thumbUrl)
      .defer(qId,     matrixLabels)
      .defer(d3.text, nodeLabelsUrl)
      .defer(d3.text, linkageUrl)
      .awaitAll(onDataLoad);
  }


  var netdata                    = {};
  netdata.loadNetwork            = loadNetwork;
  netdata.createNetwork          = createNetwork;
  netdata.setNumClusters         = setNumClusters;
  netdata.setEdgeWidthWeightIdx  = setEdgeWidthWeightIdx;
  netdata.setEdgeColourWeightIdx = setEdgeColourWeightIdx;
  netdata.extractSubNetwork      = extractSubNetwork;

  return netdata;
});
