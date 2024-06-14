#!/bin/bash
rsync -a --exclude="node_modules" . root@www.ragfix.ai:/home/ragtruth-processor/