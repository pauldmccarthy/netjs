`netjs`
=======

`netjs` is used by the
[FSLNets](http://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FSLNets) `nets_netweb`
function to generate an interactive web page for browsing the results of a
FSLNets analysis. But `netjs` is completely independent of FSLNets, and
doesn't actually know anything about functional connectivity - it can be used
with any network data. The files [js/main.js](../blob/master/js/main.js), and
[index.html](../blob/master/index.html) are useful starting points for
learning how to use `netjs`.


The two most important functions for users of `netjs` are `loadNetwork`
(defined in [js/netdata.js](../blob/master/js/netdata.js)) and
`displayNetwork` (defined in [js/netjs.js](../blob/master/js/netjs.js)).


The `loadNetwork` accepts a bunch of arguments specifying the locations of the
various bits of data which specify the network, and default values for how
that network should be displayed. These arguments are passed to the
`loadNetwork` function in a container object, such as:


```javascript
var args             = {};

// A URL pointing to a plain text file which contains a
// space-separated square connectivity matrix.  Only
// undirected networks are supported currently. More than
// one matrix file may be provided.
args.matrices        = ["url/to/correlation/matrix.txt"];

// A label for each of the above connectivity matrices.
args.matrixLabels    = ["Label for correlation matrix"];

// A URL pointing to a plain text file containing a numeric
// label for each node. More than one label file may be
// provided.
args.nodeData        = ["url/to/node/data.txt"];

// A label for each of the above node label files.
args.nodeDataLabels  = ["Label for node data"];

// A URL pointing to a plain text file containing
// a name, one name per line, for each node.  More
// than one name file may be specified.
args.nodeNames       = ["url/to/node/names.txt"];

// A label for each of the above node name files
args.nodeNameLabels  = ["Label for node names"];

// Default node naming scheme to use. If not specified,
// or set to -1, nodes are named by their index into
// the connectivity matrix (starting from 1).
args.nodeNameIdx     = -1;

// A URL pointing to a plain text file containing the
// network dendrogram in the same format as that
// produced by the MATLAB linkage function.
args.linkage         =  "url/to/linkages.txt";

// A URL pointing to a plain text file, containing an
// explicit node display ordering, to use instead of
// using the network dendrogram. The ordering is
// specified with node indices (starting from 0),
// relative to the order of nodes in the connectivity
// matrices. More than one ordering may be specified.
//
// Note: The user is able to choose between displaying
// the network dendrogram, and displaying the nodes
// in any of the orderings specified here.
args.nodeOrders      = ["url/to/node/orders.txt"];

// A label for each of the above node orderings.
args.nodeOrderLabels = ["Label for node order"];

// The default node ordering to use. If not specified,
// or if set to -1, the nodes are displayed according
// to the network dendrogram (specified by linkages).
args.nodeOrderIdx    = -1;

// A URL pointing to a directory containing .png thumbnail images
// for each node. Every node in the network is given a sequential
// ID starting from 0. The file name of the thumbnail for a given
// node must be a four-digit, zero-padded integer. For exmaple, the
// thumbnail for the first node (node 0) must have the name
// "0000.png", and the thumbnail for the 25th node (node 24) must
// have the name "0024.png".
args.thumbnails      =  "url/to/thumbnail/dir/";

// A function which must accept two parameters - a connectivity
// matrix, and a sequence of arguments. This function must
// create and return a copy of the given matrix, where the
// values for edges which do not pass thresholding have been
// replaced with NaN. The second parameter contains values which
// have been set by the user - see the thresVals option below.
args.thresFunc       = thresholdFunc;

// A list of options which will be made available for the user to
// modify, and which are passed to the threshold function above.
args.thresVals       = [0.75];

// A label for each of the threshold options defined above.
args.thresLabels     = ["Threshold label"];

// The default connectivity matrix to use (an index into the
// matrices list defined above).
args.thresholdIdx    = 0;

// The initial number of clusters to which the network
// dendrogram tree should be flattened.
args.numClusters     = 10;

netjs.loadNetwork(args, onLoadFunc);
```

The values contained in the `args` object are all documented in the `loadNetwork` function documentation. The second parameter to `loadNetwork` is a callback function which will be called
when the network data has been loaded, and a network object created. It must accept a single parameter, the created network object, and then ideally call the `displayNetwork` function.

The `displayNetwork` function expects a network, and a container object which specifies a range of required and optional display settings. The most important settings are shown in the example below - take a look at the `displayNetwork` function documentation in [netjs.js](../blob/master/js/netjs.js) for more settings:

```javascript
var display = {};

// netjs uses a HTML canvas to display the
// network. You need to provide a <div>
// element in which this canvas can be
// embedded, and you need to specify the
// width and height, in pixels, of this
// canvas:
display.networkDiv    = "#fullNetwork";
display.networkWidth  = 800;
display.networkHeight = 600;

// If you wish to be able to display the
// sub-network which is formed by a
// selected node and all of its neighours,
// you need to provide the id of another
// <div> element in which to display the
// sub-network canvas. This is optional
// though:
display.subNetDiv    = "#subNetwork";
display.subNetWidth  = 800;
display.subNetHeight = 600;

// You can optionally provide a third
// <div> element which will be used to
// display some widgets allowing the user
// to control the network display:
display.controlDiv = "#networkCtrl";

// You can enable highlighting, and
// sub-network display by default:
display.highlightOn = true;
display.subnetOn    = true;

// Node labels are displayed using a
// SVG <text> element. You can style
// the text with the following options:

// Node label font size (the "font-size" attribute):
display.labelSize = 12;

// Node label font weight (the "font-weight" attribute):
display.labelWeight = 'normal';

// Node label font (the "font-family" attribute):
display.labelFont = 'sans';

// Nodes are drawn using a SVG <circle> element.
// Nodes are coloured according to the nodeData
// argument passed to loadNetwork, however nodes
// can be customised with the following:

// Node radius (the "r" attribute):
display.nodeSize     = 3;

// Node opacity (the "opacity" attribute):
display.nodeOpacity = 0.5;

// Node thumbnails are drawn using a
// SVG <image> element, which can be
// customised with the following:
display.thumbWidth   = 45.5;
display.thumbHeight  = 54.5;

// Nodes are arranged in a circle, and grouped
// according to the clustering information
// provided in the linkages data file. The
// distance (with the unit being node diameter)
// between node groups can be changed with
// this parameter:
display.groupDistance = 2;

// Edges are drawn with a SVG <path> element.
// You can customise both edge colour and edge
// width, and you have a few options for each.

// You may choose to either give all
// edges the same colour, like so:
display.edgeColour = "#0000ff";

// Or, you can have edges coloured according
// to the corresponding connectivity matrix
// value. Do this by defining a colour range:
display.edgeMinColour = "#0000dd";
display.edgeMidColour = "#eeeeee";
display.edgeMaxColour = "#dd0000";

// And then setting the edgeColour
// argument to "default":
display.edgeColour = "default";

// Similarly, you can choose to have all
// edges drawn with the same width in pixels:
display.edgeWidth = 2;

// Or you can have edge widths scaled
// by the connectivity matrix, by
// setting edgeWidth to "scale":
display.edgeWidth = "scale";

// Remember, there are more fine grained
// display settings - see the displayNetwork
// function documentation in netjs.js for
// details.
```


Putting these two functions (`loadNetwork` and `displayNetwork`) together, the
code in your `main.js` file should look something like the following:


```javascript

var args    = {};
var display = {};

// ...
// populate the args and display
// objects as shown above
// ...

// Call the loadNetwork function, and pass
// the network on to the displayNetwork function.
netjs.loadNetwork(args, function(net) {
  netjs.displayNetwork(net, display);
});
```
