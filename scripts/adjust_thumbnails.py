#!/usr/bin/env python
#
# adjust_thumbnails.py -
#
# Author: Paul McCarthy <pauldmccarthy@gmail.com>
#

from __future__ import print_function

import            os
import os.path as op
import            sys
import            argparse

import numpy            as np
import matplotlib.image as mplimg


def main(argv=None):

    if argv is None:
        argv = sys.argv[1:]

    args = parseargs(argv)

    if not op.exists(args.outdir):
        os.makedirs(args.outdir)

    for image in args.image:

        print('Processing {}...'.format(image))

        data = mplimg.imread(image)
        data = add_alpha(data)

        if args.adjust_greyscale is not None:
            data = adjust_greyscale(data, args.adjust_greyscale)

        if args.to_transparent is not None:
            data = to_transparent(data, args.to_transparent)

        outimg = op.join(args.outdir, op.basename(image))

        mplimg.imsave(outimg, data)


def parseargs(argv):

    parser = argparse.ArgumentParser()

    parser.add_argument('-d', '--adjust_greyscale', type=float)
    parser.add_argument('-t', '--to_transparent',   type=float)

    parser.add_argument('outdir')
    parser.add_argument('image', nargs='+')

    return parser.parse_args(argv)

def add_alpha(data):
    if data.shape[2] == 4:
        return data

    newdata = np.ones((data.shape[0], data.shape[1], 4), dtype=np.float32)

    newdata[:, :, :3] = data

    return newdata


def to_transparent(data, threshold):

    intensities = np.sum(data[..., :3], axis=2)

    xs, ys = np.where(intensities <= (threshold / 3.))

    data[xs, ys, 3] = 0
    
    return data


def change(data, from_, to):

    if len(from_) == 3:
        targets = np.ones(data.shape, dtype=np.bool)
        targets[:, :, :3] = np.isclose(data[:, :, :3], from_)
        
    elif len(from_) == 4:
        targets = np.isclose(data, from_)

    targets = np.all(targets, axis=2)

    xs, ys = np.where(targets)

    if   len(to) == 3: data[xs, ys, :] = to + [1]
    elif len(to) == 4: data[xs, ys, :] = to

    return data


def adjust_greyscale(data, factor):

    greys = np.isclose(data[..., 0], data[..., 1]) & \
            np.isclose(data[..., 0], data[..., 2])

    xs, ys = np.where(greys)
    
    data[xs, ys, :3] += factor

    return np.clip(data, 0, 1)


if __name__ == '__main__':
    main()
