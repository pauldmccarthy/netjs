#!/usr/bin/env python
#
# netjs_dist.py -
#
# Author: Paul McCarthy <pauldmccarthy@gmail.com>
#


import sys
import argparse


def genNetJs(namespace, outdir):

    basedir = op.dirname(__file__)
    jsdir   = op.join(basedir, '..', 'js')

    jsTemplate   = op.join(basedir, 'templates', 'main.js')
    htmlTemplate = op.join(basedir, 'templates', 'index.html')
    htmlTemplate = open(htmlTemplate, 'rt').read()
    htmlTemplate = j2.Template(htmlTemplate)
    html         = htmlTemplate.render(**namespace)

    shutil.copytree(jsdir,      op.join(outdir, 'js'))
    shutil.copy(    jsTemplate, op.join(outdir, 'js', 'main.js'))

    with open(op.join(outdir, 'index.html'), 'wt') as f:
        f.write(html)


def parseargs(args):
    parser = argparse.ArgumentParser('netjs_dist')
    parser.add_argument('-c', '--connectivity', nvals=2)


def main(args):
    pass


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
