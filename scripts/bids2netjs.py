#!/usr/bin/env python
#
# bids2netjs.py -
#
# Author: Paul McCarthy <pauldmccarthy@gmail.com>
#
"""
Need to generate/extract
 - connectivity matrix
 - node labels
 - node ordering
 - node grouping
 - hierarchy
 - thumbnails



Output directory has following contents:
 - matrixN.txt       - connectivity matrix N
 - hierarchyN.txt    - Hierarchy for connectivity matrix N
 - labelsXX.txt      - Node labels
 - ordersXX.txt      - Node ordering
 - groupsXX.txt      - Node grouping
 - thumbnailMMMM.png - Node MMMM thumbnail
"""


import                  sys
import                  os
import os.path       as op
import                  math
import                  shutil

import bids.grabbids as grabbids


def getConnectivity(layout, indir, outdir):
    return getConnectivityFile(
        layout, indir, outdir, 'connectivity.tsv', 'connectivity')


def getHierarchy(layout, indir, outdir):
    return getConnectivityFile(
        layout, indir, outdir, 'clustering.tsv', 'clustering')


def getNodeLabels(layout, indir, outdir):
    return getNodeMeta(layout, outdir, 'node_labels', 'labels')


def getNodeOrders(layout, indir, outdir):
    return getNodeMeta(layout, outdir, 'node_orders', 'orders')


def getNodeGroups(layout, indir, outdir):
    return getNodeMeta(layout, outdir, 'node_groups', 'groups')


def getConnectivityFile(layout, indir, outdir, src, dest):

    netmats = layout.get(conndata='network', extensions=src)

    if len(netmats) == 0:
        raise RuntimeError('{} does not look like a FSLNets-'
                           'BIDS data set!'.format(indir))

    numdigits = math.floor(math.log10(len(netmats))) + 1
    fmt       = '{}{{:0{}d}}.txt'.format(dest, numdigits)

    for i, nm in enumerate(netmats):

        dest = op.join(outdir, fmt.format(i))
        shutil.copy(nm.filename, dest)


def getNodeMeta(layout, outdir, key, prefix):

    # I am assuming that node labels
    # (and orderings and groupings)
    # are same for every netmat
    netmats  = layout.get(conndata='network', extensions='_connectivity.tsv')
    metasets = layout.get_metadata(netmats[0].filename).get(key, {})
    metamap  = {}

    for i, (name, data) in enumerate(metasets.items()):

        metamap[name] = i
        dest          = op.join(outdir, '{}{}.txt'.format(prefix, i))

        with open(dest, 'wt') as f:
            f.write('\n'.join([str(d) for d in data]))

    return metamap


def getThumbnails(layout, indir, outdir):

    thumbnails = layout.get(conndata='node', extensions='thumbnail.png')

    for thumb in thumbnails:

        index = int(thumb.index) - 1
        dest  = op.join(outdir, 'thumbnail{:04d}.png'.format(index))

        shutil.copy(thumb.filename, dest)


def main(args=None):
    if args is None:
        args = sys.argv[1:]

    if len(args) != 2:
        raise RuntimeError('Usage: bids2netjs.py indir outdir')

    indir  = args[0]
    outdir = args[1]

    basedir = op.dirname(__file__)
    config  = op.join(basedir, 'bids-connectivity-derivatives.json')
    layout  = grabbids.BIDSLayout(indir, config=config)

    if not op.exists(outdir):
        os.makedirs(outdir)

    getConnectivity(layout, indir, outdir)
    getNodeLabels(  layout, indir, outdir)
    getNodeOrders(  layout, indir, outdir)
    getNodeGroups(  layout, indir, outdir)
    getThumbnails(  layout, indir, outdir)


if __name__ == '__main__':
    sys.exit(main())
