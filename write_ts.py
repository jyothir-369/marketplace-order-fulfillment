# -*- coding: utf-8 -*-
import os, sys
p = sys.argv[1]
ts = os.path.join(os.path.dirname(p), 'page.tsx')
with open(ts, 'w', encoding='utf-8') as f:
    f.write('PLACEHOLDER')
print('Written:', ts)
