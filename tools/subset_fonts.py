# 使う文字だけのフォントを作る: python3 tools/subset_fonts.py <google/fontsのofl>
import glob, re, subprocess, sys
src = sys.argv[1]
text = ''.join(open(f, encoding='utf8').read() for f in glob.glob('js/*.js') + ['index.html'])
chars = set(text)
chars |= {chr(c) for c in list(range(0x20, 0x7f)) + list(range(0x3041, 0x3097)) + list(range(0x30a1, 0x30fb)) + [0x30fc, 0x3001, 0x3002, 0xff01, 0xff1f]}
open('fonts/.chars', 'w', encoding='utf8').write(''.join(sorted(c for c in chars if c >= ' ')))
for ttf, out in [('delagothicone/DelaGothicOne-Regular.ttf', 'DelaGothicOne-subset'), ('kleeone/KleeOne-SemiBold.ttf', 'KleeOne-SemiBold-subset')]:
    subprocess.run(['pyftsubset', f'{src}/{ttf}', '--text-file=fonts/.chars', '--flavor=woff', f'--output-file=fonts/{out}.woff', '--layout-features=*'], check=True)
