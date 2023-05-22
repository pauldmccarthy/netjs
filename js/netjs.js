/*
 * Application interface for the netjs library. Exposes two functions:
 *
 *   - loadNetwork:     Given a bunch of URLs and metadata, loads
 *                      the data at the URLs and creates a network.
 *                      from it.
 *   - displayNetwork:  Displays a network on a div.
 *
 * Author: Paul McCarthy <pauldmccarthy@gmail.com>
 */
define(
  ["netvis", "netdata", "netctrl", "netvis_dynamics"],
  function(netvis, netdata, netctrl, dynamics) {

  /*
   * Displays the given network on a specified <div> element. The
   * display object must have the following attributes:
   *
   *   - networkDiv:    ID of a div element in which to place the network
   *                    canvas.
   *   - controlDiv:    ID of a div element in which to  place the network
   *                    controls.
   *   - networkWidth:  Width in pixels of network div.
   *   - networkHeight: Width in pixels of network div.
   *
   * If you want to be able to display the sub-network consisting
   * of the selected node and its immediate neighbours, the dispaly
   * object must also have:
   *
   *   - subNetDiv:    ID of a div element in which to place the sub-network
   *                   canvas.
   *   - subNetWidth:  Width in pixels of subnetwork div.
   *   - subNetHeight: Height in pixels of subnetwork div.
   *
   * The display object may also contain the following optional attributes.
   * Network nodes have three possible display 'states': default, highlighted,
   * and selected. Edges have two possible display states: default and
   * highlighted. You can customise the display properties individually
   * for each state, by setting the 'def*', 'hlt*' and 'sel*' attributes,
   * as listed below. Or you can globally set the display property. For example,
   * setting the 'labelSize' attribute will override any of the 'defLabelSize',
   * 'hltLabelSize' or 'selLabelSize' attributes.
   *
   * Attributes controlling general settings:
   *
   *  - showLabels
   *  - backgroundColour
   *
   * Attributes controlling node label font size:
   *
   *   - labelSize
   *   - defLabelSize
   *   - hltLabelSize
   *   - selLabelSize
   *
   * Attributes controlling node label font weight (e.g. 'normal', 'bold',
   * etc):
   *
   *   - labelWeight
   *   - defLabelWeight
   *   - hltLabelWeight
   *   - selLabelWeight
   *
   * Attributes controlling the node label font family (e.g. 'sans'):
   *
   *   - labelFont
   *   - defLabelFont
   *   - hltLabelFont
   *   - selLabelFont
   *
   * Attributes controlling the node radius in pixels:
   *
   *   - nodeSize
   *   - defNodeSize
   *   - hltNodeSize
   *   - selNodeSize
   *
   * Attributes controlling the node opacity (between 0.0 and 1.0):
   *
   *   - nodeOpacity
   *   - defNodeOpacity
   *   - hltNodeOpacity
   *   - selNodeOpacity
   *
   * Attributes controlling edge color. The edgeColour, defEdgeColour and
   * hltEdgeColour attriutes can be a constant colour specified as a
   * hexadecimal RGB string (e.g. "#ffffff"). alternately, they can be
   * 'default' or 'highlight', in which case the edges are coloured according
   * to their corresponding network matrix value, and a colour range specified
   * by the edgeMinColour, edgeMidColour and edgeMaxColour attributes.  Or,
   * the edgeColourMap parameter may be a list of colours, which will be
   * mapped to, and interpolated across, the data range. If edgeColourMap is
   * provided, it must contain an odd number of colours, so that a single
   * colour is able to be mapped to the minimum edge strength.  The 'default'
   * colour is a pseudo-transparent version of the 'highlight' colour.
   *
   * By default, the minimum colour will be mapped to the negative of the
   * maximum absolute edge strength, and the maximum colour mapped to the
   * positive of the maximum absolute edge strength (i.e. so the colour map
   * will be centered at 0). This can be overridden with the edgeColourMin
   * and edgeColourMax parameters, which specify the edge strength values that
   * correspond to the minimum and maximum edge colours - these are applied
   * symmetrically to positive and negative edge strengths.
   *
   *   - edgeColour
   *   - defEdgeColour
   *   - hltEdgeColour
   *   - edgeMinColour
   *   - edgeMidColour
   *   - edgeMaxColour
   *   - edgeColourMap
   *   - edgeColourMin
   *   - edgeColourMax
   *
   * Attributes controlling the edge width in pixels. Any of these parameters
   * can be 'scale', in which case each edge width is scaled according to
   * the corresponding network matrix value. When the edge width is
   * 'scale', the minimum/maximum edge widths are set according to the
   * minEdgeWidth and maxEdgeWidth parameters. By default, the minimum and
   * maximum edge widths will correspond to the absolute minimum and maximum
   * edge strengths (symmetrically to positive/negative edges), although this
   * can be overridden via the edgeWidthMin and edgeWidthMax parameters.
   *
   *   - edgeWidth
   *   - defEdgeWidth
   *   - hltEdgeWidth
   *   - minEdgeWidth
   *   - maxEdgeWidth
   *   - edgeWidthMin
   *   - edgeWidthMax
   *
   * Attribute controlling the distance between groups of nodes on the
   * network circumference, with the unit being node diameters:
   *   - groupDistance
   *
   * Attributes controlling the node thumbnail size in pixels:
   *   - thumbWidth
   *   - thumbHeight
   *   - defThumbWidth
   *   - defThumbHeight
   *   - hltThumbWidth
   *   - hltThumbHeight
   *   - selThumbWidth
   *   - selThumbHeight
   *
   *   - nodeRadiusOffset
   *   - edgeRadiusOffset
   *   - labelRadiusOffset
   *   - thumbnailRadiusOffset
   *
   * Attributes controlling initial state:
   *   - highlightOn
   *   - subnetOn
   */
  function displayNetwork(network, display) {

    var networkDiv    = display.networkDiv;
    var subNetDiv     = display.subNetDiv;
    var controlDiv    = display.controlDiv;
    var networkWidth  = display.networkWidth;
    var networkHeight = display.networkHeight;
    var subNetWidth   = display.subNetWidth;
    var subNetHeight  = display.subNetHeight;
    var vd            = netvis.visDefaults;

    if (subNetDiv === undefined) {
      subNetDiv = null;
    }
    if (controlDiv === undefined) {
      controlDiv = null;
    }

    // TODO Instead of modifying the visDefaults
    //      object, you should probably modify
    //      the network.display object (it may not
    //      have been created yet - see the
    //      netvis.displayNetwork function. This
    //      would be more suitable if you want to
    //      add real-time configurability.

    if (display.defLabelSize) vd.DEF_LABEL_SIZE = display.defLabelSize;
    if (display.hltLabelSize) vd.HLT_LABEL_SIZE = display.hltLabelSize;
    if (display.selLabelSize) vd.SEL_LABEL_SIZE = display.selLabelSize;
    if (display.labelSize) {
      vd.DEF_LABEL_SIZE = display.labelSize;
      vd.HLT_LABEL_SIZE = display.labelSize;
      vd.SEL_LABEL_SIZE = display.labelSize;
    }

    if (display.defLabelWeight) vd.DEF_LABEL_WEIGHT = display.defLabelWeight;
    if (display.hltLabelWeight) vd.HLT_LABEL_WEIGHT = display.hltLabelWeight;
    if (display.selLabelWeight) vd.SEL_LABEL_WEIGHT = display.selLabelWeight;
    if (display.labelWeight) {
      vd.DEF_LABEL_WEIGHT = display.labelWeight;
      vd.HLT_LABEL_WEIGHT = display.labelWeight;
      vd.SEL_LABEL_WEIGHT = display.labelWeight;
    }

    if (display.defLabelFont) vd.DEF_LABEL_FONT = display.defLabelFont;
    if (display.hltLabelFont) vd.HLT_LABEL_FONT = display.hltLabelFont;
    if (display.selLabelFont) vd.SEL_LABEL_FONT = display.selLabelFont;
    if (display.labelFont) {
      vd.DEF_LABEL_FONT = display.labelFont;
      vd.HLT_LABEL_FONT = display.labelFont;
      vd.SEL_LABEL_FONT = display.labelFont;
    }

    if (display.defNodeSize) vd.DEF_NODE_SIZE = display.defNodeSize;
    if (display.hltNodeSize) vd.HLT_NODE_SIZE = display.hltNodeSize;
    if (display.selNodeSize) vd.SEL_NODE_SIZE = display.selNodeSize;
    if (display.nodeSize) {
      vd.DEF_NODE_SIZE = display.nodeSize;
      vd.HLT_NODE_SIZE = display.nodeSize;
      vd.SEL_NODE_SIZE = display.nodeSize;
    }

    if (display.defNodeOpacity) vd.DEF_NODE_OPACITY = display.defNodeOpacity;
    if (display.hltNodeOpacity) vd.HLT_NODE_OPACITY = display.hltNodeOpacity;
    if (display.selNodeOpacity) vd.SEL_NODE_OPACITY = display.selNodeOpacity;
    if (display.nodeOpacity) {
      vd.DEF_NODE_OPACITY = display.nodeOpacity;
      vd.HLT_NODE_OPACITY = display.nodeOpacity;
      vd.SEL_NODE_OPACITY = display.nodeOpacity;
    }

    if (display.defEdgeColour) vd.DEF_EDGE_COLOUR = display.deftEdgeColour;
    if (display.hltEdgeColour) vd.HLT_EDGE_COLOUR = display.hltEdgeColour;
    if (display.edgeColour) {
      vd.DEF_EDGE_COLOUR  = display.edgeColour;
      vd.HLT_EDGE_COLOUR  = display.edgeColour;
    }

    if (display.edgeMinColour) vd.EDGE_MIN_COLOUR = display.edgeMinColour;
    if (display.edgeMidColour) vd.EDGE_MID_COLOUR = display.edgeMidColour;
    if (display.edgeMaxColour) vd.EDGE_MAX_COLOUR = display.edgeMaxColour;
    if (display.edgeColourMap) vd.EDGE_COLOURMAP  = display.edgeColourMap;
    if (display.edgeColourMin) vd.EDGE_COLOUR_MIN = display.edgeColourMin;
    if (display.edgeColourMax) vd.EDGE_COLOUR_MAX = display.edgeColourMax;

    if (display.defEdgeWidth) vd.DEF_EDGE_WIDTH = display.defEdgeWidth;
    if (display.hltEdgeWidth) vd.HLT_EDGE_WIDTH = display.hltEdgeWidth;
    if (display.edgeWidth) {
      vd.DEF_EDGE_WIDTH = display.edgeWidth;
      vd.HLT_EDGE_WIDTH = display.edgeWidth;
    }

    if (display.minEdgeWidth) vd.MIN_EDGE_WIDTH = display.minEdgeWidth;
    if (display.maxEdgeWidth) vd.MAX_EDGE_WIDTH = display.maxEdgeWidth;
    if (display.edgeWidthMin) vd.EDGE_WIDTH_MIN = display.edgeWidthMin;
    if (display.edgeWidthMax) vd.EDGE_WIDTH_MAX = display.edgeWidthMax;

    if (display.defEdgeOpacity) vd.DEF_EDGE_OPACITY = display.defEdgeOpacity;
    if (display.hltEdgeOpacity) vd.HLT_EDGE_OPACITY = display.hltEdgeOpacity;
    if (display.edgeOpacity) {
      vd.DEF_EDGE_OPACITY = display.edgeOpacity;
      vd.HLT_EDGE_OPACITY = display.edgeOpacity;
    }

    if (display.defThumbWidth)  vd.DEF_THUMB_WIDTH  = display.defThumbWidth;
    if (display.hltThumbWidth)  vd.HLT_THUMB_WIDTH  = display.hltThumbWidth;
    if (display.selThumbWidth)  vd.SEL_THUMB_WIDTH  = display.selThumbWidth;
    if (display.defThumbHeight) vd.DEF_THUMB_HEIGHT = display.defThumbHeight;
    if (display.hltThumbHeight) vd.HLT_THUMB_HEIGHT = display.hltThumbHeight;
    if (display.selThumbHeight) vd.SEL_THUMB_HEIGHT = display.selThumbHeight;
    if (display.thumbWidth) {
      vd.DEF_THUMB_WIDTH  = display.thumbWidth;
      vd.HLT_THUMB_WIDTH  = display.thumbWidth;
      vd.SEL_THUMB_WIDTH  = display.thumbWidth;
    }
    if (display.thumbHeight) {
      vd.DEF_THUMB_HEIGHT  = display.thumbHeight;
      vd.HLT_THUMB_HEIGHT  = display.thumbHeight;
      vd.SEL_THUMB_HEIGHT  = display.thumbHeight;
    }

    if (display.groupDistance)
      vd.GROUP_DISTANCE = display.groupDistance;

    if (display.nodeRadiusOffset)
      vd.NODE_RADIUS_OFFSET = display.nodeRadiusOffset;

    if (display.edgeRadiusOffset)
      vd.EDGE_RADIUS_OFFSET = display.edgeRadiusOffset;

    if (display.labelRadiusOffset)
      vd.LABEL_RADIUS_OFFSET = display.labelRadiusOffset;

    if (display.thumbnailRadiusOffset)
      vd.THUMBNAIL_RADIUS_OFFSET = display.thumbnailRadiusOffset;

    if (display.backgroundColour)
      vd.BACKGROUND_COLOUR = display.backgroundColour;

    if (display.showLabels !== undefined)
      vd.SHOW_LABELS = display.showLabels;

    netvis.displayNetwork(network, networkDiv, networkWidth, networkHeight);
    dynamics.configDynamics(network);

    netctrl.createNetworkControls(
      network,
      networkDiv,
      controlDiv,
      subNetDiv,
      subNetWidth,
      subNetHeight,
      display.highlightOn,
      display.subnetOn);
  }

  var netjs = {};
  netjs.loadNetwork    = netdata.loadNetwork;
  netjs.displayNetwork = displayNetwork;

  return netjs;
});
