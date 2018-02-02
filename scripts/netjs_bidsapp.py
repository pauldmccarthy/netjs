#!/usr/bin/env python3
import argparse
import os
import subprocess
import nibabel
import numpy
from glob import glob

__version__ = open(os.path.join(os.path.dirname(os.path.realpath(__file__)),
                                'version')).read()

def run(command, env={}):
    merged_env = os.environ
    merged_env.update(env)
    process = subprocess.Popen(command, stdout=subprocess.PIPE,
                               stderr=subprocess.STDOUT, shell=True,
                               env=merged_env)
    while True:
        line = process.stdout.readline()
        line = str(line, 'utf-8')[:-1]
        print(line)
        if line == '' and process.poll() != None:
            break
    if process.returncode != 0:
        raise Exception("Non zero return code: %d"%process.returncode)

parser = argparse.ArgumentParser(description='BIDS-netjs')
parser.add_argument(
    'bids_dir',
    help='Directory containing a BIDS connectivity derivatives data set.')
parser.add_argument(
    'output_dir',
    help='Directory to store the netjs HTML report')

parser.add_argument('-v', '--version', action='version',
                    version='BIDS-App example version {}'.format(__version__))

args = parser.parse_args()
