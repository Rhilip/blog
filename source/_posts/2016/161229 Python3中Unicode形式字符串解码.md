---
title: Python3中Unicode形式字符串解码
date: 2016-12-29 14:57:00
categories:
 - [Coding, Python]
tags: 
 - unicode
permalink: /archives/319/
---

在某个奇葩的文件(temp.txt)中，有这么一串字符串

```js
s17.chapterId=1002037128;s17.contentId=null;s17.contentType=1;s17.gmtCreate=1471894343268;s17.gmtModified=1471894343268;s17.id=1002294678;s17.isTestChecked=false;s17.name="\u7B2C1\u8BB2-\u521D\u6B65\u8BA4\u8BC6\u6570\u636E\u5E93\u7CFB\u7EDF";s17.position=1;s17.releaseTime=1473040800000;s17.termId=1001785022;s17.test=null;s17.testDraftStatus=0;s17.units=s28;s17.viewStatus=3;
```

现在用Python读入，并用re模块解析获取name中的信息

```python
import re
raw = open('temp.txt','r').read()
name = re.search(r'.name="(.+)";', index).group(1)
```

然而此时输出name的话，你会发现输出是`\u7B2C1\u8BB2-\u521D\u6B65\u8BA4\u8BC6\u6570\u636E\u5E93\u7CFB\u7EDF`，而不是我们预先想要的该段Unicode对应出来的中文字符。


----------

但是直接对该字符串进行decode('unicode_escape')的方法时，Python 3 会报错提示str并没有decode的方法" AttributeError: 'str' object has no attribute 'decode' "。

因为 Python3 中的 str 对象实为 Unicode 统一码，而不是Python2中的字节串，并没有某一（如ASCII，GBK之类）具体编码值，没有某一具体编码值固然也就不存在decode方法来对其解码，而应先对其 encode 成某一具体编码实现再以某一编码形式去解码再交由用户处理。（thanks x1ah@Github）

故给出了以下的处理方法：

```python
name = str(re.search(r'.name="(.+)";', index).group(1)).encode('utf-8').decode('unicode_escape')
```


----------

相关知乎讨论：[Python3中如何得到Unicode码对应的中文？](https://www.zhihu.com/question/26921730)
