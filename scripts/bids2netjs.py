#!/usr/bin/env python
#
# bids2netjs.py - Generate a netjs report from a compatible BIDS
#                 connectivity derivatives data set.
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
 - matrixN.txt                  - connectivity matrix N
 - hierarchyN.txt               - Hierarchy for connectivity matrix N
 - labelsXX.txt                 - Node labels
 - ordersXX.txt                 - Node ordering
 - groupsXX.txt                 - Node grouping
 - thumbnails/thumbnailMMMM.png - Node MMMM thumbnail
"""


import                  sys
import                  os
import os.path       as op
import                  math
import                  shutil
import subprocess    as sp

import numpy         as np
import nibabel       as nib
import jinja2        as j2
import bids.grabbids as grabbids

import                  adjust_thumbnails


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


def getUnderlay(layout, indir, outdir):

    mean = layout.get(conndata='network', type='mean')

    if len(mean) == 0:
        return None

    dest = op.join(outdir, 'images', 'underlay.png')

    genMosaic(mean[0].filename, dest, 'mean')

    return dest


def getConnectivityFile(layout, indir, outdir, src, dest):

    netmats   = layout.get(conndata='network', extensions=src)

    if len(netmats) == 0:
        return []

    numdigits = math.floor(math.log10(len(netmats))) + 1
    fmt       = '{}{{:0{}d}}.txt'.format(dest, numdigits)
    files     = []

    for i, nm in enumerate(netmats):

        # Convert tab-sep to space-sep
        dest = op.join(outdir, fmt.format(i))
        data = np.loadtxt(nm.filename)

        np.savetxt(dest, data)

        files.append(dest)

    return files


def getNodeMeta(layout, outdir, key, prefix):

    # I am assuming that node labels
    # (and orderings and groupings)
    # are same for every netmat
    netmats  = layout.get(conndata='network', extensions='_connectivity.tsv')
    metasets = layout.get_metadata(netmats[0].filename).get(key, {})
    metamap  = {}

    for i, (name, data) in enumerate(metasets.items()):

        dest          = op.join(outdir, '{}{}.txt'.format(prefix, i))
        metamap[name] = dest

        with open(dest, 'wt') as f:
            f.write('\n'.join([str(d) for d in data]))

    return metamap


def getThumbnails(layout, indir, outdir):

    thumbnails = layout.get(conndata='node', extensions='thumbnail.png')
    tndir      = op.join(outdir, 'thumbnails')

    if len(thumbnails) == 0:
        return None

    os.makedirs(tndir)

    for thumb in thumbnails:

        index = int(thumb.index) - 1
        dest  = op.join(tndir, '{:04d}.png'.format(index))

        shutil.copy(thumb.filename, dest)

    return tndir


def genMosaic(src, dest, ttype):

    shape   = nib.load(src).shape
    w, h    = shape[:2]
    nslices = shape[ 2]
    ncols   = 10
    nrows   = int(np.ceil(nslices / float(ncols)))

    args = {
        'dest'  : dest,
        'ncols' : ncols,
        'nrows' : nrows,
        'w'     : w * ncols,
        'h'     : h * nrows,
        'image' : src
    }

    if ttype in ('mode', 'ic'):
        args['cmopts'] = '-cm red-yellow -nc blue-lightblue -un -cr 2.5 100'
    elif ttype in ('roi', 'mask'):
        args['cmopts'] = '-ot mask -mc 1 0 0'
    else:
        args['cmopts'] = '-cm greyscale -b 40'

    cmd = 'fsleyes render -of {dest} -sz {w} {h} -zx 2 ' \
          '-slightbox -hc -nr {nrows} -nc {ncols} {image} {cmopts}'

    cmd = cmd.format(**args)

    sp.call(cmd.split())

    # adjust_thumbnails.main(['-t', '0', op.dirname(dest), dest])


def getNodeImages(layout, indir, outdir):

    images = layout.get(conndata='node', extensions='.nii.gz')
    imdir  = op.join(outdir, 'images')

    if len(images) == 0:
        return None, (0, 0)

    os.makedirs(imdir)

    dests = []
    w, h = 0, 0

    for img in images:
        index = int(img.index) - 1
        dest  = op.join(imdir, '{:04d}.png'.format(index))
        genMosaic(img.filename,  dest, img.type)
        dests.append(dest)

    return imdir, (w, h)


def getNetJs(namespace, outdir):

    basedir      = op.dirname(__file__)
    jsdir        = op.join(basedir, '..', 'js')
    cssdir       = op.join(basedir, '..', 'css')
    htmlTemplate = op.join(basedir, '..', 'index.html')

    htmlTemplate = open(htmlTemplate, 'rt').read()
    htmlTemplate = j2.Template(htmlTemplate)
    html         = htmlTemplate.render(**namespace)

    shutil.copytree(jsdir,  op.join(outdir, 'js'))
    shutil.copytree(cssdir, op.join(outdir, 'css'))

    with open(op.join(outdir, 'index.html'), 'wt') as f:
        f.write(html)


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
    datadir = op.join(outdir, 'data')

    if not op.exists(datadir):
        os.makedirs(datadir)

    matrices     = getConnectivity(layout, indir, datadir)
    linkages     = getHierarchy(   layout, indir, datadir)
    names        = getNodeLabels(  layout, indir, datadir)
    orders       = getNodeOrders(  layout, indir, datadir)
    groups       = getNodeGroups(  layout, indir, datadir)
    thumbnails   = getThumbnails(  layout, indir, datadir)
    images, imsz = getNodeImages(  layout, indir, datadir)
    underlay     = getUnderlay(    layout, indir, datadir)

    matrices   = [op.relpath(f, outdir) for f in matrices]
    linkages   = [op.relpath(f, outdir) for f in linkages]
    names      = [op.relpath(f, outdir) for f in names .values()]
    orders     = [op.relpath(f, outdir) for f in orders.values()]
    groups     = [op.relpath(f, outdir) for f in groups.values()]

    if images     is None: images     = ""
    else:                  images     = op.relpath(images,     outdir)
    if thumbnails is None: thumbnails = ""
    else:                  thumbnails = op.relpath(thumbnails, outdir)
    if underlay   is None: underlay   = ""
    else:                  underlay   = op.relpath(underlay,   outdir)

    matrix_labels = [str(i) for i in range(len(matrices))]
    name_labels   = [str(i) for i in range(len(names))]
    group_labels  = [str(i) for i in range(len(groups))]
    order_labels  = [str(i) for i in range(len(orders))]


    if len(linkages) > 0: linkages = linkages[0]
    else:                 linkages = ""

    matrices   = '|'.join(matrices)
    names      = '|'.join(names)
    orders     = '|'.join(orders)
    groups     = '|'.join(groups)
    image_size = '|'.join(map(str, imsz))

    matrix_labels = '|'.join(matrix_labels)
    name_labels   = '|'.join(name_labels)
    group_labels  = '|'.join(group_labels)
    order_labels  = '|'.join(order_labels)

    namespace               = {}
    namespace['matrices']   = matrices
    namespace['linkages']   = linkages
    namespace['names']      = names
    namespace['orders']     = orders
    namespace['groups']     = groups
    namespace['thumbnails'] = thumbnails
    namespace['underlay']   = underlay
    namespace['images']     = images
    namespace['image_size'] = image_size

    namespace['matrix_labels'] = matrix_labels
    namespace['name_labels']   = name_labels
    namespace['group_labels']  = group_labels
    namespace['order_labels']  = order_labels

    getNetJs(namespace, outdir)


if __name__ == '__main__':
    sys.exit(main())
