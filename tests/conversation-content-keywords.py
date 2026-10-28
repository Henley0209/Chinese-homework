"""Regression: new short grammar dialogues may contain punctuation between clauses."""
import ast
import re
from pathlib import Path

source=Path(__file__).resolve().parents[1]/'tools/generate-conversation-banks.py'
tree=ast.parse(source.read_text())
function=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='keywords_for')
namespace={'re':re,'STOP':set('我 你 他 她 是 的 了 吗 呢 在 有 不 很 也 都 和'.split())}
exec(compile(ast.Module(body=[function],type_ignores=[]),str(source),'exec'),namespace)
keywords_for=namespace['keywords_for']
for answer in ['我很好，你呢？','我也是，你呢？','我来，你去。','这是，我的。']:
    keys=keywords_for(answer,[])
    assert keys and all(k in answer for k in keys),(answer,keys)
    assert answer.replace(keys[0],'（空白）',1)!=answer
assert keywords_for('这是我的护照。',['护照'])==['护照']
print('通过：关键词保留为原答案的连续子串，可用于带逗号的简短语法对话。')
