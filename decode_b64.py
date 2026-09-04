# -*- coding: utf-8 -*-
import base64, sys
dest = sys.argv[1]
encoded_path = sys.argv[2]
encoded = open(encoded_path, 'r', encoding='utf-8').read().strip()
decoded = base64.b64decode(encoded).decode('utf-8')
with open(dest, 'w', encoding='utf-8') as f:
    f.write(decoded)
print('OK', dest)
