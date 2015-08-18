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
   * The display object may also contain the following optional attributes:
   * 
   *   - defaultLabelSize
   *   - highlightLabelSize
   *   - selectLabelSize
   *   - labelSize
   *
   *   - defaultLabelWeight
   *   - highlightLabelWeight
   *   - selectLabelWeight
   *   - labelWeight
   *
   *   - defaultLabelFont
   *   - highlightLabelFont
   *   - selectLabelFont
   *   - labelFont
   * 
   *   - defaultNodeSize
   *   - highlightNodeSize
   *   - selectNodeSize
   *   - nodeSize
   *
   *   - defaultNodeOpacity
   *   - highlightNodeOpacity
   *   - selectNodeOpacity
   *   - nodeOpacity
   *
   *   - defaultEdgeColour
   *   - highlightEdgeColour
   *   - edgeColour
   *   - edgeMinColour
   *   - edgeMidColour
   *   - edgeMaxColour
   *
   * edgeColour can be a constant colour, or 
   * 'default' or 'highlight', in which case
   * the min/mid/max colours are used.
   *
   *   - defaultEdgeWidth
   *   - highlightEdgeWidth
   *   - edgeWidth
   *
   * edgeWidth can be 'scale'
   *
   *   - defaultEdgeOpacity
   *   - highlightEdgeOpacity
   *   - edgeOpacity
   * 
   *   - groupDistance
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

    // TODO Instead of modifying the visDefaults
    //      object, you should probably modify
    //      the network.display object (it may not
    //      have been created yet - see the
    //      netvis.displayNetwork function. This
    //      would be more suitable if you want to
    //      add real-time configurability.

    if (display.defaultLabelSize)
      vd.DEF_LABEL_SIZE = display.defaultLabelSize;
    if (display.highlightLabelSize)
      vd.HLT_LABEL_SIZE = display.highlightLabelSize;
    if (display.selectLabelSize)
      vd.SEL_LABEL_SIZE = display.selectLabelSize;
    if (display.labelSize) {
      vd.DEF_LABEL_SIZE = display.labelSize;
      vd.HLT_LABEL_SIZE = display.labelSize;
      vd.SEL_LABEL_SIZE = display.labelSize;
    }
    
    if (display.defaultLabelWeight)
      vd.DEF_LABEL_WEIGHT = display.defaultLabelWeight;
    if (display.highlightLabelWeight)
      vd.HLT_LABEL_WEIGHT = display.highlightLabelWeight;
    if (display.selectLabelWeight)
      vd.SEL_LABEL_WEIGHT = display.selectLabelWeight;
    if (display.labelWeight) {
      vd.DEF_LABEL_WEIGHT = display.labelWeight;
      vd.HLT_LABEL_WEIGHT = display.labelWeight;
      vd.SEL_LABEL_WEIGHT = display.labelWeight;
    }

    if (display.defaultLabelFont)
      vd.DEF_LABEL_FONT = display.defaultLabelFont;
    if (display.highlightLabelFont)
      vd.HLT_LABEL_FONT = display.highlightLabelFont;
    if (display.selectLabelFont)
      vd.SEL_LABEL_FONT = display.selectLabelFont;
    if (display.labelFont) {
      vd.DEF_LABEL_FONT = display.labelFont;
      vd.HLT_LABEL_FONT = display.labelFont;
      vd.SEL_LABEL_FONT = display.labelFont;
    }

    if (display.defaultNodeSize)
      vd.DEF_NODE_SIZE = display.defaultNodeSize;
    if (display.highlightNodeSize)
      vd.HLT_NODE_SIZE = display.highligtNodeSize;
    if (display.selectNodeSize)
      vd.SEL_NODE_SIZE = display.selectNodeSize;
    if (display.nodeSize) {
      vd.DEF_NODE_SIZE = display.nodeSize;
      vd.HLT_NODE_SIZE = display.nodeSize;
      vd.SEL_NODE_SIZE = display.nodeSize;
    }

    if (display.defaultNodeOpacity)
      vd.DEF_NODE_OPACITY = display.defaultNodeOpacity;
    if (display.highlightNodeOpacity)
      vd.HLT_NODE_OPACITY = display.highlightNodeOpacity;
    if (display.selectNodeOpacity)
      vd.SEL_NODE_OPACITY = display.selectNodeOpacity;
    if (display.nodeOpacity) {
      vd.DEF_NODE_OPACITY = display.nodeOpacity;
      vd.HLT_NODE_OPACITY = display.nodeOpacity;
      vd.SEL_NODE_OPACITY = display.nodeOpacity;
    }

    if (display.defaultEdgeColour)
      vd.DEF_EDGE_COLOUR = display.defaultEdgeColour;
    if (display.highlightEdgeColour)
      vd.HLT_EDGE_COLOUR = display.highlightEdgeColour;
    if (display.edgeColour) {
      vd.DEF_EDGE_COLOUR  = display.edgeColour;
      vd.HLT_EDGE_COLOUR  = display.edgeColour;
    }

    if (display.edgeMinColour) vd.EDGE_MIN_COLOUR = display.edgeMinColour;
    if (display.edgeMidColour) vd.EDGE_MID_COLOUR = display.edgeMidColour;
    if (display.edgeMaxColour) vd.EDGE_MAX_COLOUR = display.edgeMaxColour;
    
    if (display.defaultEdgeWidth)
      vd.DEF_EDGE_WIDTH = display.defaultEdgeWidth;
    if (display.highlightEdgeWidth)
      vd.HLT_EDGE_WIDTH = display.highlightEdgeWidth;
    if (display.edgeWidth) {
      vd.DEF_EDGE_WIDTH = display.edgeWidth;
      vd.HLT_EDGE_WIDTH = display.edgeWidth;
    }

    if (display.defaultEdgeOpacity)
      vd.DEF_EDGE_OPACITY = display.defaultEdgeOpacity;
    if (display.highlightEdgeOpacity)
      vd.HLT_EDGE_OPACITY = display.highlightEdgeOpacity;
    if (display.edgeOpacity) {
      vd.DEF_EDGE_OPACITY = display.edgeOpacity;
      vd.HLT_EDGE_OPACITY = display.edgeOpacity;
    }

    if (display.groupDistance)
      vd.GROUP_DISTANCE = display.groupDistance;


    netvis.displayNetwork(network, networkDiv, networkWidth, networkHeight);
    dynamics.configDynamics(network); 

    netctrl.createNetworkControls(
      network, controlDiv, subNetDiv, subNetWidth, subNetHeight);
  }

  var netjs = {};
  netjs.loadNetwork    = netdata.loadNetwork;
  netjs.displayNetwork = displayNetwork;

  return netjs;
});
