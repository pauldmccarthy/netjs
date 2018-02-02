/*
 * Load, create, and modify objects representing networks.
 *
 * Author: Paul McCarthy <pauldmccarthy@gmail.com>
 */
define(["lib/d3", "lib/queue"], function(d3, queue) {

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
      allClusts      = allClusts.filter(function(n) { return n !== null; } );
      var uniqClusts = [];

      for (var i = 0; i < allClusts.length; i++) {
        if (uniqClusts.indexOf(allClusts[i]) > -1) continue;
        uniqClusts.push(allClusts[i]);
      }

      return uniqClusts;
    }

    // Iterate through the list of clusters,
    // merging them  one by one, until we are
    // left with (at most) maxClusters.
    var clusters = getClusters();

    while (clusters.length > maxClusters) {

      // Identify the cluster with the minimum
      // distance between its children
      var distances = clusters.map(function(clust) {

        // the root node has no parent
        if (clust.parent) return clust.parent.distance;
        else              return Number.MAX_VALUE;
      });
      var minIdx    = distances.indexOf(d3.min(distances));

      var clust         = clusters[minIdx];
      var parent        = clust.parent;
      var children      = clust.children;
      var clustChildIdx = parent.children.indexOf(clust);
      var clustTreeIdx  = network.treeNodes.indexOf(clust);

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
   * This function is called by the setNumClusters function. All Any nodes
   * which are disconnected (have no neighbours) are removed from the
   * dendrogram tree. The nodes are kept in the network, but their
   * 'parent' attribute is set to null.
   */
  function pruneDendrogramTree(network) {

    if (!network.pruningState)
      return

    var nodes     = network.nodes;
    var treeNodes = network.treeNodes;

    // Removes the specified node
    // from the dendrogram tree.
    function removeFromTree(n) {

      // we've reached the root node
      if (n.parent === undefined) {
        return;
      }

      var parent  = n.parent;
      var nIdx    = parent.children.indexOf(n);
      var treeIdx = treeNodes      .indexOf(n);

      if (nIdx    > -1) parent.children.splice(nIdx,    1);
      if (treeIdx > -1) treeNodes      .splice(treeIdx, 1);

      // If this node had no siblings,
      // then remove its parent too.
      if (parent.children.length === 0) {
        removeFromTree(parent);
      }
    }

    // Search all the real nodes in the network,
    // and remove any disconnected ones from the
    // dendrogram tree.
    for (var i = 0; i < nodes.length; i++) {

      if (nodes[i].neighbours.length == 0) {

        var node     = nodes[i];
        var leafNode = node.parent;
        var nIdx     = leafNode.children.indexOf(node);

        // set the node parent to null -
        // this is detected by the
        // netvis.drawNodes function
        node.parent  = null;

        // remove the node from its
        // parent's list of children
        leafNode.children.splice(nIdx, 1);

        removeFromTree(leafNode);
      }
    }
  }

  /*
   * Given a network (see the createNetwork function), and the
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

    // Create a dummy leaf node for every node in the network
    var leafNodes = network.nodes.map(function(node, i) {
      var leafNode      = {};
      leafNode.index    = numNodes + linkages.length + i;
      leafNode.children = [node];
      node.parent       = leafNode;

      return leafNode;
    });

    for (var i = 0; i < linkages.length; i++) {
      var treeNode = {};
      var leftIdx  = linkages[i][0];
      var rightIdx = linkages[i][1];
      var left;
      var right;

      if (leftIdx  > numNodes) left  = treeNodes[leftIdx  - 1 - numNodes];
      else                     left  = leafNodes[leftIdx  - 1];
      if (rightIdx > numNodes) right = treeNodes[rightIdx - 1 - numNodes];
      else                     right = leafNodes[rightIdx - 1];

      left .parent = treeNode;
      right.parent = treeNode;

      treeNode.children = [left, right];
      treeNode.distance = linkages[i][2];
      treeNode.index    = i + numNodes;

      treeNodes.push(treeNode);
    }

    network.treeNodes = leafNodes.concat(treeNodes);
  }

  /*
   * Extracts and returns a sub-matrix from the given
   * parent matrix, containing the data at the indices
   * in the specified index array.
   */
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
   * Extracts and returns a subnetwork from the given network,
   * consisting of the node at the specified index, all of the
   * neighbours of that node, and all of the edges between
   * them.
   */
  function extractSubNetwork(network, rootIdx) {

    var oldRoot  = network.nodes[rootIdx];

    // Create a list of node indices, in the parent
    // network, of all nodes to be included in the
    // subnetwork
    var nodeIdxs = [rootIdx];

    for (var i = 0; i < oldRoot.neighbours.length; i++) {
      nodeIdxs.push(oldRoot.neighbours[i].index);
    }
    nodeIdxs.sort(function(a,b){return a-b;});

    // Create a bunch of sub-matrices containing
    // the data for the above list of nodes
    var subMatrices = network.matrices.map(
      function(matrix) {return extractSubMatrix(matrix, nodeIdxs);});

    // create a bunch of node data arrays
    // from the original network node data
    var subNodeData = network.nodeData.map(function(array) {
      return nodeIdxs.map(function(idx) {
        return array[idx];
      });
    });

    // Do the same for the node names
    var subNodeNames = network.nodeNames.map(function(array) {
      return nodeIdxs.map(function(idx) {
        return array[idx];
      });
    });

    // And for the node orders
    var subNetMask = [];
    for (var i = 0; i < network.nodes.length; i++) {
      if (nodeIdxs.indexOf(i) > -1) subNetMask.push(1);
      else                          subNetMask.push(0);
    }

    var subNodeOrders = network.nodeOrders.map(function(array) {
      return adjustIndices(array, subNetMask);
    });


    var subnet = createNetwork(
      subMatrices,
      network.matrixLabels,
      subNodeData,
      network.nodeDataLabels,
      subNodeNames,
      network.nodeNameLabels,
      network.nodeNameIdx,
      null,
      null,
      subNodeOrders,
      network.nodeOrderLabels,
      network.nodeOrderIdx,
      network.thumbUrl,
      network.thresholdFunc,
      network.thresholdValues,
      network.thresholdValueLabels,
      network.thresholdIdx,
      1);

    // Copy matrix min/max arrays over
    subnet.matrixMins    = network.matrixMins;
    subnet.matrixMaxs    = network.matrixMaxs;
    subnet.matrixAbsMins = network.matrixAbsMins;
    subnet.matrixAbsMaxs = network.matrixAbsMaxs;

    // Fix node thumbnails, and add
    // indices for each subnetwork
    // node back to the corresponding
    // parent network node
    var zerofmt = d3.format("04d");
    for (var i = 0; i < subnet.nodes.length; i++) {

      var node = subnet.nodes[i];

      node.fullNetIndex = network.nodes[nodeIdxs[i]].index;

      if (subnet.thumbUrl !== null) {
        var imgurl = network.thumbUrl + "/" + zerofmt(nodeIdxs[i]) + ".png";
        node.thumbnail = imgurl;
      }
    }

    // Create a dummy dendrogram with a single cluster
    setNumClusters(subnet, 1);

    // save a reference to the parent network?
    // subnet.parentNetwork = network;

    return subnet;
  }

  /*
   * Creates a tree representing the dendrogram specified
   * in the linkage data provided when the network was loaded,
   * and flattens the tree so that it contains (at most) the
   * specified number of clusters. If there was no linkage
   * data specified when the network was loaded, this function
   * does nothing.
   */
  function setNumClusters(network, numClusts) {

    if (network.linkage === null) {

      // Create a dummy dendrogram with a single cluster
      var root = {};
      root.index    = network.nodes.length;
      // Make sure we take a copy of the
      // nodes array for the root node's
      // children, as the root node children
      // might be modified
      root.children = network.nodes.slice();
      network.nodes.forEach(function(node) {node.parent = root;});
      network.treeNodes = [root];

      pruneDendrogramTree(network);
      return;
    }

    // generate a tree of dummy nodes from
    // the dendrogram in the linkages data
    makeNetworkDendrogramTree(network, network.linkage);

    // Remove any disconnected nodes
    pruneDendrogramTree(network);

    // flatten the tree to the specified number of clusters
    flattenDendrogramTree(network, numClusts);

    network.numClusters = numClusts;
  }

  function setPruningState(network, prune) {
    network.pruningState = prune;
    setNumClusters(network, network.numClusters);
  }

  /*
   * Creates a list of edges for the given network by calling
   * the 'thresFunc' function provided when the network was
   * loaded. The network edges are defined by the matrix at
   * network.matrices[network.thresholdIdx].  The list of
   * values in all matrices (including the one just mentioned)
   * for a given edge is added as an attribute called 'weight'
   * on that edge.
   */
  function thresholdNetwork(network) {

    var matrix   = network.matrices[network.thresholdIdx];
    var numNodes = network.nodes.length;

    // Create a list of edges
    network.edges = [];

    // threshold the matrix. It is assumed that the
    // provided threshold function behaves nicely
    // by thresholding a copy of the matrix, not
    // the matrix itself.
    matrix = network.thresholdFunc(matrix, network.thresholdValues);

    // initialise node neighbour/edge arrays
    for (var i = 0; i < numNodes; i++) {
      network.nodes[i].edges      = [];
      network.nodes[i].neighbours = [];
    }

    // Currently only undirected
    // networks are supported
    for (var i = 0; i < numNodes; i++) {
      for (var j = i+1; j < numNodes; j++) {

        // NaN values in the matrix
        // are not added as edges
        if (isNaN(matrix[i][j])) continue;

        var edge     = {};
        edge.i       = network.nodes[i];
        edge.j       = network.nodes[j];
        edge.weights = network.matrices.map(function(mat) {return mat[i][j];});

        // d3.layout.bundle and d3.layout.force require two
        // attributes, 'source' and 'target', so we add them
        // here purely for convenience.
        edge.source  = edge.i;
        edge.target  = edge.j;

        network.edges.push(edge);
        network.nodes[i].neighbours.push(network.nodes[j]);
        network.nodes[j].neighbours.push(network.nodes[i]);
        network.nodes[i].edges     .push(edge);
        network.nodes[j].edges     .push(edge);
      }
    }
  }

  /*
   * Creates a network from the given data.
   */
  function createNetwork(
    matrices,
    matrixLabels,
    nodeData,
    nodeDataLabels,
    nodeNames,
    nodeNameLabels,
    nodeNameIdx,
    linkage,
    linkageOrder,
    nodeOrders,
    nodeOrderLabels,
    nodeOrderIdx,
    thumbUrl,
    thresholdFunc,
    thresholdValues,
    thresholdValueLabels,
    thresholdIdx,
    numClusters) {

    var network  = {};
    var nodes    = [];
    var numNodes = matrices[0].length;
    var zerofmt  = d3.format("04d");

    // Create a list of nodes
    for (var i = 0; i < numNodes; i++) {

      var node      = {};

      node.index    = i;
      node.nodeData = nodeData.map(function(array) {return array[i];});

      if (linkageOrder !== null) node.order = linkageOrder.indexOf(i);
      else                       node.order = i;

      // Attach a thumbnail URL to
      // every node in the network
      if (thumbUrl !== null) {
        var imgUrl = thumbUrl + "/" + zerofmt(i) + ".png";
        node.thumbnail = imgUrl;
      }
      else {
        node.thumbnail = null;
      }

      nodes.push(node);
    }

    network.nodes                = nodes;
    network.nodeData             = nodeData;
    network.nodeDataLabels       = nodeDataLabels;
    network.nodeNames            = nodeNames;
    network.nodeNameLabels       = nodeNameLabels;
    network.nodeNameIdx          = nodeNameIdx;
    network.matrices             = matrices;
    network.matrixLabels         = matrixLabels;
    network.linkage              = linkage;
    network.nodeOrders           = nodeOrders;
    network.nodeOrderLabels      = nodeOrderLabels;
    network.nodeOrderIdx         = nodeOrderIdx;
    network.thumbUrl             = thumbUrl;
    network.thresholdFunc        = thresholdFunc;
    network.thresholdValues      = thresholdValues;
    network.thresholdValueLabels = thresholdValueLabels;
    network.thresholdIdx         = thresholdIdx;
    network.numClusters          = numClusters;
    network.pruningState         = false;

    // create the network edges
    thresholdNetwork(network);

    // Create a dendrogram, and flatten it
    // to the specified number of clusters.
    // This will do nothing if this network
    // has no linkage data.
    setNumClusters(network, numClusters);

    // This scaleInfo object stores refs
    // to the index of the matrices used
    // to determine edge width/colour and
    // node colour, and is used by the
    // netvis.js module to store colour
    // maps and luts for edges and nodes.
    var scaleInfo = {};
    network.scaleInfo       = scaleInfo;
    scaleInfo.edgeWidthIdx  = thresholdIdx;
    scaleInfo.edgeColourIdx = thresholdIdx;
    scaleInfo.nodeColourIdx = 0;

    // console.log(network);

    return network;
  }

  /*
   * Sets the matrix data used to scale edge widths
   * to the matrix at the specified index.
   */
  function setEdgeWidthIdx(network, idx) {

    if (idx < 0 || idx >= network.matrices.length) {
      throw "Matrix index out of range.";
    }

    network.scaleInfo.edgeWidthIdx = idx;
  }

  /*
   * Sets the matrix data used to colour edges
   * to the matrix at the specified index.
   */
  function setEdgeColourIdx(network, idx) {

    if (idx < 0 || idx >= network.matrices.length) {
      throw "Matrix index out of range.";
    }

    network.scaleInfo.edgeColourIdx = idx;
  }

  /*
   * Sets the node data used to colour nodes
   * to the node data at the specified data index.
   */
  function setNodeColourIdx(network, idx) {
    if (idx < 0 || idx >= network.nodeDataLabels.length) {
      throw "Node data index out of range."
    }
    network.scaleInfo.nodeColourIdx = idx;
  }

  /*
   * Sets the node name - -1 corresponds to using
   * node indices as their names.
   */
  function setNodeNameIdx(network, idx) {
    if (idx < -1 || idx >= network.nodeNameLabels.length) {
      throw "Node name index out of range."
    }
    network.nodeNameIdx = idx;
  }

  /*
   * Sets the node ordering - -1 corresponds to using
   * the linkage/dendrogram information.
   */
  function setNodeOrderIdx(network, idx) {

    if (idx < -1 || idx >= network.nodeOrderLabels.length) {
      throw "Node order index out of range";
    }

    network.nodeOrderIdx = idx;
  }

  /*
   * Sets the matrix used to threshold the network to the
   * matrix at the specified index, and re-thresholds the
   * network.
   */
  function setThresholdIdx(network, idx) {

    if (idx < 0 || idx >= network.matrices.length) {
      throw "Matrix index out of range.";
    }

    network.thresholdIdx = idx;

    // this forces re-thresholding, and all
    // the other stuff that needs to be done
    setThresholdValue(network, 0, network.thresholdValues[0]);
  }

  /*
   * Sets the value for the threshold function argument at
   * the given index, and re-thresholds the network.
   */
  function setThresholdValue(network, idx, value) {

    if (idx < 0 || idx >= network.thresholdValues.length) {
      throw "Threshold value index out of range.";
    }

    network.thresholdValues[idx] = value;
    thresholdNetwork(network);

    // force recreation of dendrogram
    setNumClusters(network, network.numClusters);
  }

  /*
   * The loadNetwork function (below) asynchronously loads
   * all of the data required to create a network. When
   * all that data is loaded, this function is called.
   * This function parses the data, passes it all to the
   * createNetwork function (above), and then passes
   * the resulting network to the onLoadFunc callback
   * function which was passed to loadNetwork.
   */
  function onDataLoad(error, args) {

    if (error !== null) {
      throw error;
    }

    var stdArgs         = args[0];
    var nodeDataLabels  = stdArgs.nodeDataLabels;
    var matrixLabels    = stdArgs.matrixLabels;
    var thumbUrl        = stdArgs.thumbnails;
    var thresFunc       = stdArgs.thresFunc;
    var thresVals       = stdArgs.thresVals;
    var thresLabels     = stdArgs.thresLabels;
    var thresholdIdx    = stdArgs.thresholdIdx;
    var nodeNameLabels  = stdArgs.nodeNameLabels;
    var nodeNameIdx     = stdArgs.nodeNameIdx;
    var nodeOrderLabels = stdArgs.nodeOrderLabels;
    var nodeOrderIdx    = stdArgs.nodeOrderIdx;
    var numClusters     = stdArgs.numClusters;
    var onLoadFunc      = stdArgs.onLoadFunc;
    var linkage         = args[1];
    var linkageOrder    = args[2];

    var numNodeData   = nodeDataLabels .length;
    var numNodeNames  = nodeNameLabels .length;
    var numMatrices   = matrixLabels   .length;
    var numNodeOrders = nodeOrderLabels.length;

    var offset     = 3;
    var nodeData   = args.slice(offset, offset + numNodeData);
    offset        += numNodeData;
    var matrices   = args.slice(offset, offset + numMatrices);
    offset        += numMatrices;
    var nodeNames  = args.slice(offset, offset + numNodeNames);
    offset        += numNodeNames;
    var nodeOrders = args.slice(offset, offset + numNodeOrders);

    if (linkage !== null)
      linkage = parseTextMatrix(linkage);

    if (linkageOrder !== null)  {
      linkageOrder = parseTextMatrix(linkageOrder);

      linkageOrder = linkageOrder.map(function(array) {
        return array.reduce(function(a, b) {return a.concat(b);});
      });
    }

    matrices   = matrices  .map(parseTextMatrix);
    nodeData   = nodeData  .map(parseTextMatrix);
    nodeOrders = nodeOrders.map(parseTextMatrix);

    // node names must be newline separated
    nodeNames = nodeNames.map(function(str) {

      var lines = str.trim().split("\n");
      return lines.map(function(l) {return l.trim();});
    });

    // node data and node order files can either
    // be space separated or newline separated.
    // if the latter, they will be returned as
    // 2D arrays - here we flatten them into 1D.
    nodeData = nodeData.map(function(array) {
      return array.reduce(function(a, b) {return a.concat(b);});
    });

    nodeOrders = nodeOrders.map(function(array) {
      return array.reduce(function(a, b) {return a.concat(b);});
    });

    // check all data arrays to ensure
    // they are of compatible lengths
    var numNodes = matrices[0].length;

    matrices.forEach(function(matrix, i) {
      var errorMsg =  "Matrix " + matrixLabels[i] + " has invalid size ";

      // number of rows
      if (matrix.length !== numNodes) {
        throw errorMsg + "(num rows: " + matrix.length + ")";
      }

      // number of columns in each row
      matrix.forEach(function(row) {
        if (row.length !== numNodes) {
          throw errorMsg + "(column length " + row.length + ")";
        }
      });
    });

    // node data arrays
    nodeData.forEach(function(array, i) {
      if (array.length !== numNodes) {
        throw "Node data array " + nodeDataLabels[i] +
              " has invalid length (" + array.length + ")";
      }
    });

    // node name arrays
    nodeNames.forEach(function(array, i) {
      if (array.length !== numNodes) {
        throw "Node names array " + nodeNameLabels[i] +
              " has invalid length (" + array.length + ")";
      }
    });

    // node order arrays
    nodeOrders.forEach(function(array, i) {
      if (array.length !== numNodes) {
        throw "Node order array " + nodeOrderLabels[i] +
          " has invalid length (" + array.length + ")";
      }
    });

    // create the network
    network = createNetwork(
      matrices,
      matrixLabels,
      nodeData,
      nodeDataLabels,
      nodeNames,
      nodeNameLabels,
      nodeNameIdx,
      linkage,
      linkageOrder,
      nodeOrders,
      nodeOrderLabels,
      nodeOrderIdx,
      thumbUrl,
      thresFunc,
      thresVals,
      thresLabels,
      thresholdIdx,
      numClusters);

    // calculate matrix minimums/maximums
    network.matrixMins    = [];
    network.matrixMaxs    = [];
    network.matrixAbsMins = [];
    network.matrixAbsMaxs = [];

    for (var mi = 0; mi < network.matrices.length; mi++) {

      var min    =  Number.MAX_VALUE;
      var max    = -Number.MAX_VALUE;
      var absMin =  Number.MAX_VALUE;
      var absMax = -Number.MAX_VALUE;

      var mat = network.matrices[mi];

      for (var i = 0; i < mat.length; i++) {
        for (var j = 0; j < mat[i].length; j++) {

          var v  =          mat[i][j];
          var av = Math.abs(mat[i][j]);

          if (v  < min)    min    = v;
          if (v  > max)    max    = v;
          if (av < absMin) absMin = v;
          if (av > absMax) absMax = v;
        }
      }

      network.matrixMins   .push(min);
      network.matrixMaxs   .push(max);
      network.matrixAbsMins.push(absMin);
      network.matrixAbsMaxs.push(absMax);
    }

    onLoadFunc(network);
  }

  /*
   * Loads all of the network data provided in the given args
   * object. When the network data is loaded, a network is created
   * and passed to the onLoadFunc callback function.
   *
   * The args object should have the following properties:
   *
   *   - matrices:        Required. A list of URLS pointing to
   *                      connectivity matrices.
   *
   *   - matrixLabels:    Optional. A list of labels for each of
   *                      the above matrices.
   *
   *   - nodeData:        Optional. A list of URLS pointing to
   *                      1D arrays of numerical data, to be
   *                      associated with the nodes in the network.
   *
   *   - nodeDataLabls:   Optional. A list of labels for each of
   *                      the above arrays.
   *
   *   - nodeNames:       Optional. A list of URLS pointing to
   *                      files containing newline-separated names
   *                      for each node in the network.
   *
   *   - nodeNameLabels:  Optional. A list of names for each of the
   *                      above arrays.
   *
   *   - linkage:         Optional. A N*3 array of data describing
   *                      the dendrogram for the network - the output
   *                      of a call to the MATLAB linkage function.
   *
   *   - linkageOrder:    Optional. A list of values, each a node
   *                      index (starting from 0) specifying the order
   *                      in which nodes should be sorted when
   *                      displaying the dendrogram layout.
   *
   *   - nodeOrders:      Optional. A list of URLS pointing to 1D
   *                      arrays of numerical data, defining the
   *                      order in which the nodes should be
   *                      displayed - when a display order is
   *                      selected, the linkage data is not used.
   *
   *   - nodeOrderLabels: Optional. A list of labels for each of the
   *                      above node orderings.
   *
   *   - thumbnails:      Optional. A URL pointing to a folder in
   *                      which thumbnails for each node may be
   *                      found. Thumbnail file names must currently
   *                      be named according to the format "%04d.png",
   *                      where "%04d" is the zero-indexed node index
   *                      in the network, padded to four characters.
   *
   *   - thresFunc:       Required. A function which accepts two
   *                      parameters - a connectivity matrix, and a
   *                      list of parameters (thresVals, see below).
   *                      This function should create and return a
   *                      thresholded copy of the provided matrix -
   *                      this thresholded matrix is used to define
   *                      network edges. Currently, all accepted
   *                      threshold  values must be between 0.0 and
   *                      1.0.
   *
   *   - thresVals:       Optional. List of parameters to be passed
   *                      to the thresFunc. Must currently be between
   *                      0.0 and 1.0.
   *
   *   - thresLabels:     Optional. List of labels for the above
   *                      threshold values.
   *
   *   - thresholdIdx:    Optional. Initial index of the connectivity
   *                      matrix used to define the network edges.
   *
   *   - nodeOrderIdx:    Optional. Initial index into the nodeOrders
   *                      list, specifying the node display order to
   *                      use. If not provided, or set to -1, the nodes
   *                      are displayed according to the linkage
   *                      (dendrogram) information.
   *
   *   - nodeNameIdx:     Optional. Initial index into the nodeNames
   *                      list, specifying the node names to use. If
   *                      not provided, or set to -1, the node indices
   *                      (starting from 1) used as the node names.
   *
   *   - numClusters:     Optional. Initial number of clusters to
   *                      flatten the network dendrogram tree to.
   */
  function loadNetwork(args, onLoadFunc) {

    var a = args;

    a.onLoadFunc = onLoadFunc;

    if (a.matrices === undefined)
      throw "A list of matrices must be specified";

    if (a.matrices.length === 0)
      throw "At least one matrix is required";

    if (a.thresFunc === undefined)
      throw "A thresFunc must be specified";

    if (a.matrixLabels === undefined)
      a.matrixLabels = a.matrices.slice(0);

    if (a.nodeData === undefined)
      a.nodeData = [];

    if (a.nodeDataLabels === undefined)
      a.nodeDataLabels = a.nodeData.map(function(nd,i){ return "" + i;});

    if (a.nodeNames === undefined)
      a.nodeNames = [];

    if (a.nodeNameLabels === undefined)
      a.nodeNameLabels = a.nodeNames.map(function(no,i){ return "" + i;});

    if (a.nodeOrders === undefined)
      a.nodeOrders = [];

    if (a.nodeOrderLabels === undefined)
      a.nodeOrderLabels = a.nodeOrders.map(function(no,i){ return "" + i;});

    if (a.nodeOrderIdx === undefined)
      a.nodeOrderIdx = -1;

    if (a.nodeNameIdx === undefined)
      a.nodeNameIdx = -1;

    if (a.thresVals === undefined)
      a.thresVals = [];

    if (a.thresLabels === undefined)
      a.thresLabels = a.thresVals.map(function(tv,i){ return "" + i;});

    if (a.linkage      === undefined) a.linkage      = null;
    if (a.linkageOrder === undefined) a.linkageOrder = null;
    if (a.thumbnails   === undefined) a.thumbnails   = null;
    if (a.thresholdIdx === undefined) a.thresholdIdx = 0;
    if (a.numClusters  === undefined) a.numClusters  = 1;

    if (a.matrices.length !== a.matrixLabels.length)
      throw "Matrix URL and label lengths do not match";

    if (a.nodeData.length !== a.nodeDataLabels.length)
      throw "Node data URL and label lengths do not match";

    if (a.nodeNames.length !== a.nodeNameLabels.length)
      throw "Node name URL and label lengths do not match";

    if (a.nodeOrders.length !== a.nodeOrderLabels.length)
      throw "Node order URL and label lengths do not match";

    if (a.thresVals.length !== a.thresLabels.length)
      throw "Threshold value and label lengths do not match";

    // The qId function is an identity function
    // which may be used to pass standard
    // arguments (i.e. arguments which are not
    // the result of an asychronous load) to the
    // await/awaitAll functions.
    function qId(arg, cb) {cb(null, arg);}

    // Load all of the network data, and
    // pass it to the onDataLoad function.
    var q = queue();

    // standard arguments
    q = q.defer(qId, a);

    // linkage data
    if (a.linkage !== null) q = q.defer(d3.text, a.linkage);
    else                    q = q.defer(qId,     a.linkage);

    // linkage order
    if (a.linkageOrder !== null) q = q.defer(d3.text, a.linkageOrder);
    else                         q = q.defer(qId,     a.linkageOrder);

    // node data
    a.nodeData.forEach(function(url) {
      q = q.defer(d3.text, url);
    });

    // matrix data
    a.matrices.forEach(function(url) {
      q = q.defer(d3.text, url);
    });

    // node names
    a.nodeNames.forEach(function(url) {
      q = q.defer(d3.text, url);
    });

    // node orders
    a.nodeOrders.forEach(function(url) {
      q = q.defer(d3.text, url);
    });

    // load all the things!
    q.awaitAll(onDataLoad);
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
   * Given an array of indices, and a mask array of the same length,
   * where 1 indicates inclusion and 0 indicates exclusion, extracts
   * the included indices, and adjusts them with respect to the
   * excluded indices.
   */
  function adjustIndices(indices, mask) {

    var newIndices = [];

    var include = indices.filter(function(n, i) {
      return mask[i] > 0;
    });

    var sorted = include.slice(0);
    sorted.sort()

    for (var i = 0; i < include.length; i++) {
      newIndices.push(sorted.indexOf(include[i]));
    }

    return newIndices;
  }



  var netdata               = {};
  netdata.loadNetwork       = loadNetwork;
  netdata.extractSubNetwork = extractSubNetwork;
  netdata.setPruningState   = setPruningState;
  netdata.setNumClusters    = setNumClusters;
  netdata.setEdgeWidthIdx   = setEdgeWidthIdx;
  netdata.setEdgeColourIdx  = setEdgeColourIdx;
  netdata.setNodeColourIdx  = setNodeColourIdx;
  netdata.setNodeNameIdx    = setNodeNameIdx;
  netdata.setNodeOrderIdx   = setNodeOrderIdx;
  netdata.setThresholdIdx   = setThresholdIdx;
  netdata.setThresholdValue = setThresholdValue;
  netdata.adjustIndices     = adjustIndices;
  return netdata;
});
